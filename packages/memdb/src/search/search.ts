import type { Table } from '../table.js';
import type { Simplify } from '../types.js';
import { levenshteinDistance } from './levenshtein.js';
import { stopwords } from './stopwords.js';

const TOKEN_IS_WORD_LIKE = 1 << 0;
const TOKEN_IS_STOPWORD = 1 << 1;
const TOKEN_IS_MATCHED = 1 << 2;

export function isTokenWordLike(flags: number): boolean {
	return (flags & TOKEN_IS_WORD_LIKE) !== 0;
}

export function isTokenStopWord(flags: number): boolean {
	return (flags & TOKEN_IS_STOPWORD) !== 0;
}

export function isTokenMatched(flags: number): boolean {
	return (flags & TOKEN_IS_MATCHED) !== 0;
}

interface SearchTokens {
	tokens: [string, number][];
	wordCount: number;
}

export function tokenize(
	text: string,
	locale?: Intl.LocalesArgument,
): SearchTokens {
	const tokens: SearchTokens['tokens'] = [];
	const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
	let wordCount = 0;

	for (const { segment, isWordLike } of segmenter.segment(text)) {
		let bitset = 0;
		if (isWordLike) {
			bitset |= TOKEN_IS_WORD_LIKE;
			wordCount++;
			if (stopwords.includes(segment.toLowerCase())) {
				bitset |= TOKEN_IS_STOPWORD;
			}
		}

		tokens.push([segment, bitset]);
	}

	return { tokens, wordCount };
}

function calculateBM25(
	termFreq: number,
	docFreq: number,
	docLength: number,
	avgDocLength: number,
	totalDocs: number,
	k1 = 1.5,
	b = 0.75,
) {
	const idf = Math.log(1 + (totalDocs - docFreq + 0.5) / (docFreq + 0.5));
	return (
		(idf * (termFreq * (k1 + 1))) /
		(termFreq + k1 * (1 - b + b * (docLength / avgDocLength)))
	);
}

export interface BM25Options {
	averageDocumentLength: number;
	documentCount: number;
	documentLengths: number[];
}

export interface SearchIndex extends BM25Options {
	invertedIndex: Map<string, Map<number, number>>;
}

export type StringValueColumns<T extends SearchDocument> = Extract<
	keyof T,
	{ [K in keyof T]: T[K] extends string ? K : never }[keyof T]
>;

export function createSearchIndex<
	T extends SearchDocument,
	C extends StringValueColumns<T>,
>(table: Table<T>, columns: C[], locale?: Intl.LocalesArgument) {
	const records = table.records;
	const invertedIndex = new Map<string, Map<number, number>>();
	const documentLengths = new Array<number>(records.length);

	let totalDocumentLength = 0;
	for (const [docId, record] of records.entries()) {
		let docLength = 0;
		for (const column of columns) {
			const value = record[column];
			const { tokens, wordCount } = tokenize(value as string, locale);
			docLength += wordCount;

			for (const [token, flags] of tokens) {
				if (flags & TOKEN_IS_WORD_LIKE && !(flags & TOKEN_IS_STOPWORD)) {
					const t = token.toLocaleLowerCase(locale);
					if (!invertedIndex.has(t)) {
						invertedIndex.set(t, new Map());
					}
					const termFreq = invertedIndex.get(t)!;
					termFreq.set(docId, (termFreq.get(docId) || 0) + 1);
				}
			}
		}

		documentLengths[docId] = docLength;
		totalDocumentLength += docLength;
	}

	const documentCount = records.length;
	const averageDocumentLength = totalDocumentLength / documentCount;

	return {
		averageDocumentLength,
		documentCount,
		documentLengths,
		invertedIndex,
	};
}

export interface SearchDocument {
	[x: string]: unknown;
}

export type SearchResult<T extends SearchDocument> = {
	index: number;
	document: T;
	score: number;
	matchedTokens: string[];
};

export function search<T extends SearchDocument>(
	table: Table<T>,
	searchIndex: SearchIndex,
	query: string,
	locale?: Intl.LocalesArgument,
) {
	const { invertedIndex, ...bm25Options } = searchIndex;
	const queryTokens = tokenize(query, locale);
	const matchedDocs = findMatchingDocs(invertedIndex, queryTokens, { locale });
	return rankBM25(matchedDocs, table, bm25Options);
}

export interface DocumentMatch {
	docFreq: number;
	fuzzyDistance: number;
	termFreq: number;
	token: string;
}

export interface FindMatchingDocsOptions {
	locale?: Intl.LocalesArgument;
	similarityThreshold?: number;
}

export function findMatchingDocs(
	invertedIndex: Map<string, Map<number, number>>,
	queryTokens: SearchTokens,
	options: FindMatchingDocsOptions,
) {
	const { locale, similarityThreshold = 2 } = options;
	const matchedDocs = new Map<number, DocumentMatch[]>();

	const uniqueTokens = new Set<string>();
	for (const [token, flags] of queryTokens.tokens) {
		if (isTokenWordLike(flags) && !isTokenStopWord(flags)) {
			uniqueTokens.add(token.toLocaleLowerCase(locale));
		}
	}

	for (const token of uniqueTokens) {
		for (const [indexToken, docs] of invertedIndex.entries()) {
			const distance = levenshteinDistance(token, indexToken);

			if (distance === 0 || distance <= similarityThreshold) {
				for (const [docId, termFreq] of docs) {
					if (!matchedDocs.has(docId)) {
						matchedDocs.set(docId, []);
					}
					matchedDocs.get(docId)!.push({
						docFreq: docs.size,
						fuzzyDistance: distance,
						termFreq,
						token: indexToken,
					});
				}
			}
		}
	}

	return matchedDocs;
}

export function rankBM25<T extends SearchDocument>(
	matchedDocs: Map<number, DocumentMatch[]>,
	table: Table<T>,
	options: BM25Options,
): Simplify<SearchResult<T>>[] {
	const { averageDocumentLength, documentCount, documentLengths } = options;
	const scores = new Array<number>(documentCount);
	const matchedTokensMap = new Map<number, Set<string>>();

	for (const [docId, terms] of matchedDocs) {
		for (const { docFreq, fuzzyDistance, termFreq, token } of terms) {
			const docLength = documentLengths[docId];
			// Apply a penalty for fuzzy matches based on Levenshtein distance
			const penaltyFactor = 1 / (fuzzyDistance + 1);
			const score =
				calculateBM25(
					termFreq,
					docFreq,
					docLength,
					averageDocumentLength,
					documentCount,
				) * penaltyFactor;
			scores[docId] = (scores[docId] || 0) + score;

			if (!matchedTokensMap.has(docId)) {
				matchedTokensMap.set(docId, new Set());
			}
			matchedTokensMap.get(docId)!.add(token);
		}
	}

	const scoreEntries = Object.entries(scores).sort(([, a], [, b]) => b - a);
	const results = [];
	for (const [docId, score] of scoreEntries) {
		const index = parseInt(docId);
		results.push({
			index,
			document: table.records[index],
			matchedTokens: Array.from(matchedTokensMap.get(index) || []),
			score,
		});
	}

	return results;
}

export type SearchHighlights<T extends SearchDocument> = {
	[K in keyof T]: [string, number][];
};

export function highlightSearchResult<
	T extends SearchDocument,
	C extends StringValueColumns<T>,
>(searchResult: SearchResult<T>, columns: C[], locale?: Intl.LocalesArgument) {
	const { document, matchedTokens } = searchResult;
	const highlightResult = {} as Simplify<SearchHighlights<Pick<T, C>>>;
	for (const column of columns) {
		const { tokens } = tokenize(document[column] as string, locale);
		highlightResult[column] = tokens.map((token) => {
			if (matchedTokens.includes(token[0].toLocaleLowerCase(locale))) {
				token[1] |= TOKEN_IS_MATCHED;
			}
			return token;
		});
	}
	return highlightResult;
}

export interface HighlightFlattenColumnsOptions {
	matchLength?: number;
	padStart?: number;
	locale?: Intl.LocalesArgument;
}

export function highlightFlattenColumns<
	T extends SearchDocument,
	C extends StringValueColumns<T>,
>(
	searchResult: SearchResult<T>,
	columns: C[],
	options?: HighlightFlattenColumnsOptions,
) {
	const { locale, matchLength = 10, padStart = 4 } = options ?? {};
	const { document, matchedTokens } = searchResult;
	const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
	const paddingSegments = new RingBuffer<[string, number][]>(padStart + 1);
	const highlights: [string, number][][] = [];

	let firstMatchFound = false;
	for (const column of columns) {
		for (const { isWordLike, segment } of segmenter.segment(
			document[column] as string,
		)) {
			let flags = 0;
			if (isWordLike) {
				const lowerSegment = segment.toLocaleLowerCase(locale);
				const isMatch = matchedTokens.includes(lowerSegment);
				flags |= TOKEN_IS_WORD_LIKE;
				if (isMatch) flags |= TOKEN_IS_MATCHED;
				if (stopwords.includes(lowerSegment)) flags |= TOKEN_IS_STOPWORD;
				if (firstMatchFound) {
					// Second accumulate elements until `matchLength` after `firstMatchFound`
					highlights.push([[segment, flags]]);
					if (highlights.length >= matchLength) break;
				} else {
					// First accumulate `padStart` elements before `firstMatchFound`
					paddingSegments.add([[segment, flags]]);
					if (isMatch) {
						firstMatchFound = true;
						highlights.push(...paddingSegments.toArray());
					}
				}
			} else {
				// Do not count non-words towards `padStart` and `matchLength` constraints
				const target = firstMatchFound
					? highlights.at(-1)
					: paddingSegments.getLast();
				if (target) target.push([segment, flags]);
			}
		}
	}

	if (!highlights.length) {
		columnLoop: for (const column of columns) {
			for (const { isWordLike, segment } of segmenter.segment(
				document[column] as string,
			)) {
				let flags = 0;
				if (isWordLike) {
					flags |= TOKEN_IS_WORD_LIKE;
					const lowerSegment = segment.toLocaleLowerCase(locale);
					if (matchedTokens.includes(lowerSegment)) flags |= TOKEN_IS_MATCHED;
					if (stopwords.includes(lowerSegment)) flags |= TOKEN_IS_STOPWORD;
					highlights.push([[segment, flags]]);
					if (highlights.length >= matchLength) break columnLoop;
				} else {
					highlights.at(-1)?.push([segment, flags]);
				}
			}
		}
	}

	return highlights.flat(1);
}

/*
    RingBuffer is 2x faster than `array.shift()` followed by `array.push()`
	https://esbench.com/bench/67043446545f8900a4de2b8f
*/
class RingBuffer<T> {
	buffer: Array<T>;
	bufferLength: number;
	index: number;
	constructor(bufferLength: number) {
		this.buffer = new Array<T>(bufferLength);
		this.bufferLength = bufferLength;
		this.index = 0;
	}
	add(element: T) {
		this.buffer[this.index] = element;
		this.index = (this.index + 1) % this.bufferLength;
	}
	getLast() {
		const lastIndex = (this.index - 1 + this.bufferLength) % this.bufferLength;
		return this.buffer[lastIndex];
	}
	toArray() {
		const isFull = this.bufferLength - 1 in this.buffer;
		if (isFull) {
			return this.buffer
				.slice(this.index)
				.concat(this.buffer.slice(0, this.index));
		}
		return this.buffer.slice(0, this.index);
	}
}
