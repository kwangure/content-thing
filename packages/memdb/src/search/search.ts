import type { Table } from '../table.js';
import type { Simplify } from '../types.js';
import { levenshteinDistance } from './levenshtein.js';
import { stopwords } from './stopwords.js';

const TOKEN_IS_WORD_LIKE = 1 << 0;
const TOKEN_IS_STOPWORD = 1 << 1;

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

export interface SearchIndex {
	invertedIndex: Map<string, Map<number, number>>;
	documentLengths: number[];
	averageDocumentLength: number;
}

export function createSearchIndex<T extends SearchDocument>(
	table: Table<T>,
	columns: { [K in keyof T]?: (value: T[K]) => string },
	locale?: Intl.LocalesArgument,
) {
	const records = table.records;
	const invertedIndex = new Map<string, Map<number, number>>();
	const documentLengths = new Array<number>(records.length);

	let totalDocumentLength = 0;
	for (const [docId, record] of records.entries()) {
		let docLength = 0;
		for (const [column, serializeFunc] of objectEntries(columns)) {
			const value = record[column];
			if (value !== null && value !== undefined && serializeFunc) {
				const serializedValue = serializeFunc(value);
				const { tokens, wordCount } = tokenize(serializedValue, locale);
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
		}

		documentLengths[docId] = docLength;
		totalDocumentLength += docLength;
	}

	const averageDocumentLength = totalDocumentLength / records.length;

	return {
		invertedIndex,
		documentLengths,
		averageDocumentLength,
	};
}

export interface SearchDocument {
	[x: string]: unknown;
}

export type SearchResult<T extends SearchDocument> = {
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
	const { invertedIndex, documentLengths, averageDocumentLength } = searchIndex;
	const queryTokens = tokenize(query, locale);
	const matchedDocs = findMatchingDocs(invertedIndex, queryTokens, { locale });
	return rankBM25(matchedDocs, table, documentLengths, averageDocumentLength);
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
	for (const [token] of queryTokens.tokens) {
		uniqueTokens.add(token.toLocaleLowerCase(locale));
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
						token: indexToken, // Use the actual matched token
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
	documentLengths: number[],
	averageDocumentLength: number,
): Simplify<SearchResult<T>>[] {
	const totalDocs = table.records.length;
	const scores = new Array<number>(totalDocs);
	const matchedTokensMap = new Map<number, Set<string>>();

	for (const [docId, terms] of matchedDocs) {
		for (const { docFreq, fuzzyDistance, termFreq, token } of terms) {
			const docLength = documentLengths[docId];
			if (typeof docLength === 'number') {
				// Apply a penalty for fuzzy matches based on Levenshtein distance
				const penaltyFactor = 1 / (fuzzyDistance + 1);
				const score =
					calculateBM25(
						termFreq,
						docFreq,
						docLength,
						averageDocumentLength,
						totalDocs,
					) * penaltyFactor;
				scores[docId] = (scores[docId] || 0) + score;

				if (!matchedTokensMap.has(docId)) {
					matchedTokensMap.set(docId, new Set());
				}
				matchedTokensMap.get(docId)!.add(token);
			}
		}
	}

	const scoreEntries = Object.entries(scores).sort(([, a], [, b]) => b - a);
	const results = [];
	for (const [docId, score] of scoreEntries) {
		const id = parseInt(docId);
		const document = table.records[id];
		const matchedTokens = Array.from(matchedTokensMap.get(id) || []);
		if (document) {
			results.push({
				id,
				document,
				matchedTokens,
				score,
			});
		}
	}

	return results;
}

export type SearchHighlights<T extends SearchDocument> = {
	[K in keyof T]: [string, boolean][];
};

function highlightText(
	text: string,
	matchedTokens: string[],
	locale?: Intl.LocalesArgument,
) {
	return tokenize(text).tokens.map(
		([token]) =>
			[
				token,
				matchedTokens.includes(token.toLocaleLowerCase(locale)),
			] satisfies [string, boolean],
	);
}

export function highlightSearchResult<
	T extends SearchDocument,
	C extends Extract<
		keyof T,
		{ [K in keyof T]: T[K] extends string ? K : never }[keyof T]
	>,
>(searchResult: SearchResult<T>, columns: C[], locale?: Intl.LocalesArgument) {
	const { document, matchedTokens } = searchResult;
	const highlightResult = {} as Simplify<SearchHighlights<Pick<T, C>>>;
	for (const column of columns) {
		const text = document[column];
		const highlights = highlightText(text as string, matchedTokens, locale);
		highlightResult[column] = highlights;
	}
	return highlightResult;
}

function objectEntries<T extends object>(obj: T) {
	return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}

export interface HighlightFirstOptions {
	matchLength?: number;
	padStart?: number;
	locale?: Intl.LocalesArgument;
}

export function highlightFirst<T extends SearchDocument>(
	searchResult: SearchResult<T>,
	columns: { [K in keyof T]?: (value: T[K]) => string },
	options?: HighlightFirstOptions,
) {
	const { locale } = options ?? {};
	let { matchLength = 10, padStart = 4 } = options ?? {};
	matchLength = matchLength >= 0 ? matchLength : 10;
	padStart = padStart >= 0 ? padStart : 4;

	const sentenceSegmenter = new Intl.Segmenter(locale, {
		granularity: 'sentence',
	});
	const wordSegmenter = new Intl.Segmenter(locale, { granularity: 'word' });
	const { document, matchedTokens } = searchResult;
	const highlights: {
		words: [string, boolean][];
	}[] = [];

	for (const [column, serializeFunc] of objectEntries(columns)) {
		let firstMatchedSentence = null;
		const previousSentences: [string, boolean][][] = [];
		const text = serializeFunc?.(document[column]);
		if (!text) continue;

		for (const { segment: sentence } of sentenceSegmenter.segment(text)) {
			const wordsInSentence: [string, boolean][] = [];
			for (const { segment: word, isWordLike } of wordSegmenter.segment(
				sentence,
			)) {
				if (
					isWordLike &&
					!firstMatchedSentence &&
					matchedTokens.includes(word.toLowerCase())
				) {
					firstMatchedSentence = {
						sentenceIndex: previousSentences.length,
						wordIndex: wordsInSentence.length,
					};
				}
				wordsInSentence.push([word, Boolean(isWordLike)]);
			}
			previousSentences.push(wordsInSentence);
		}

		// If no match is found, skip this column
		if (!firstMatchedSentence) continue;

		// Find the starting sentence and word index based on padStart
		let startSentenceIndex = firstMatchedSentence.sentenceIndex;
		let startWordIndex = firstMatchedSentence.wordIndex;
		let wordsCounted = 0;
		for (
			let i = firstMatchedSentence.sentenceIndex;
			i >= 0 && wordsCounted <= padStart;
			i--
		) {
			const words = previousSentences[i]!;
			const jStart =
				i === firstMatchedSentence.sentenceIndex
					? firstMatchedSentence.wordIndex
					: words.length - 1;
			for (let j = jStart; j >= 0 && wordsCounted <= padStart; j--) {
				const isWordLike = words[j]![1];
				startSentenceIndex = i;
				startWordIndex = j;
				if (isWordLike) {
					wordsCounted++;
				}
			}
		}
		wordsCounted = 0;
		for (
			let i = startSentenceIndex;
			i < previousSentences.length && wordsCounted < matchLength;
			i++
		) {
			// Construct the final array of words up to matchLength
			const finalWords: [string, boolean][] = [];
			const words = previousSentences[i]!;
			for (
				let j = i === startSentenceIndex ? startWordIndex : 0;
				j < words.length && wordsCounted < matchLength;
				j++
			) {
				const [word, isWordLike] = words[j]!;
				const isHighlighted = matchedTokens.includes(word!.toLowerCase());
				finalWords.push([word!, isHighlighted]);
				if (isWordLike) {
					wordsCounted++;
				}
			}
			highlights.push({
				words: finalWords,
			});
		}
	}

	return highlights;
}
