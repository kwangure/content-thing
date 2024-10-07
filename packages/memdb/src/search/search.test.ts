import { assert, describe, expect, it } from 'vitest';
import {
	createSearchIndex,
	findMatchingDocs,
	highlightFlattenColumns,
	highlightSearchResult,
	rankBM25,
	search,
	tokenize,
	type DocumentMatch,
} from './search.js';
import { createTable } from '../table.js';

describe('tokenize', () => {
	it('tokenizes simple English words', () => {
		expect(tokenize('hello world')).toEqual({
			tokens: [
				['hello', 1],
				[' ', 0],
				['world', 1],
			],
			wordCount: 2,
		});
	});

	it('handles punctuation', () => {
		expect(tokenize('Hello, world!')).toEqual({
			tokens: [
				['Hello', 1],
				[',', 0],
				[' ', 0],
				['world', 1],
				['!', 0],
			],
			wordCount: 2,
		});
	});

	it('handles numbers and special characters', () => {
		expect(tokenize('abc123 @#$')).toEqual({
			tokens: [
				['abc123', 1],
				[' ', 0],
				['@', 0],
				['#', 0],
				['$', 0],
			],
			wordCount: 1,
		});
	});

	it('handles empty string', () => {
		expect(tokenize('')).toEqual({
			tokens: [],
			wordCount: 0,
		});
	});

	it('handles string with only spaces', () => {
		expect(tokenize('   ')).toEqual({
			tokens: [['   ', 0]],
			wordCount: 0,
		});
	});

	it('handles string with only non-word characters', () => {
		expect(tokenize('@#$%')).toEqual({
			tokens: [
				['@', 0],
				['#', 0],
				['$', 0],
				['%', 0],
			],
			wordCount: 0,
		});
	});

	it('removes stopwords', () => {
		expect(tokenize('the quick brown fox')).toEqual({
			tokens: [
				['the', 3],
				[' ', 0],
				['quick', 1],
				[' ', 0],
				['brown', 1],
				[' ', 0],
				['fox', 1],
			],
			wordCount: 4,
		});
	});

	it('handles mixed stopwords and regular words', () => {
		expect(tokenize('she sells seashells by the seashore')).toEqual({
			tokens: [
				['she', 3],
				[' ', 0],
				['sells', 1],
				[' ', 0],
				['seashells', 1],
				[' ', 0],
				['by', 3],
				[' ', 0],
				['the', 3],
				[' ', 0],
				['seashore', 1],
			],
			wordCount: 6,
		});
	});

	it('handles text with only stopwords', () => {
		expect(tokenize('and the but')).toEqual({
			tokens: [
				['and', 3],
				[' ', 0],
				['the', 3],
				[' ', 0],
				['but', 3],
			],
			wordCount: 3,
		});
	});

	it('handles stopwords with punctuation', () => {
		expect(tokenize('And, the! but.')).toEqual({
			tokens: [
				['And', 3],
				[',', 0],
				[' ', 0],
				['the', 3],
				['!', 0],
				[' ', 0],
				['but', 3],
				['.', 0],
			],
			wordCount: 3,
		});
	});

	it('is case insensitive for stopwords', () => {
		expect(tokenize('THE QUICK Brown fox')).toEqual({
			tokens: [
				['THE', 3],
				[' ', 0],
				['QUICK', 1],
				[' ', 0],
				['Brown', 1],
				[' ', 0],
				['fox', 1],
			],
			wordCount: 4,
		});
	});
});

describe('findMatchingDocs', () => {
	it('should find exact matches in the inverted index', () => {
		const invertedIndex = new Map([
			['apple', new Map([[1, 2]])],
			[
				'banana',
				new Map([
					[1, 1],
					[2, 1],
				]),
			],
		]);

		const queryTokens = {
			tokens: [['apple', 1]] as [string, number][],
			wordCount: 1,
		};
		const results = findMatchingDocs(invertedIndex, queryTokens, {});

		expect(results.get(1)).toEqual([
			{ docFreq: 1, termFreq: 2, token: 'apple', fuzzyDistance: 0 },
		]);
	});

	it('should find fuzzy matches within the similarity threshold', () => {
		const invertedIndex = new Map([
			['apple', new Map([[1, 2]])],
			[
				'banana',
				new Map([
					[1, 1],
					[2, 1],
				]),
			],
		]);

		const queryTokens = {
			tokens: [['appl', 1]] as [string, number][], // One character off
			wordCount: 1,
		};
		const results = findMatchingDocs(invertedIndex, queryTokens, {
			similarityThreshold: 1,
		});

		expect(results.get(1)).toEqual([
			{ docFreq: 1, termFreq: 2, token: 'apple', fuzzyDistance: 1 },
		]);
	});

	it('should not find matches if the distance exceeds the threshold', () => {
		const invertedIndex = new Map([
			['apple', new Map([[1, 2]])],
			[
				'banana',
				new Map([
					[1, 1],
					[2, 1],
				]),
			],
		]);

		const queryTokens = {
			tokens: [['appl', 1]] as [string, number][], // One character off
			wordCount: 1,
		};
		const results = findMatchingDocs(invertedIndex, queryTokens, {
			similarityThreshold: 0, // No fuzzy matching
		});

		expect(results.size).toBe(0); // No matches
	});
});

describe('rankBM25', () => {
	it('should rank documents with exact matches higher than fuzzy matches', () => {
		const table = {
			records: [
				{ id: 1, title: 'apple' },
				{ id: 2, title: 'banana' },
				{ id: 3, title: 'cherry' },
			],
		};

		const matchedDocs = new Map<number, DocumentMatch[]>([
			[0, [{ docFreq: 1, fuzzyDistance: 2, termFreq: 2, token: 'apple' }]], // Fuzzy match
			[1, [{ docFreq: 1, fuzzyDistance: 0, termFreq: 2, token: 'banana' }]], // Exact match
			[2, [{ docFreq: 1, fuzzyDistance: 1, termFreq: 2, token: 'cherry' }]], // Fuzzy match
		]);

		const results = rankBM25(matchedDocs, table, {
			documentLengths: [5, 5, 5],
			averageDocumentLength: 5,
			documentCount: 3,
		});

		expect(results[0].document.id).toBe(2); // Exact match should rank higher
		expect(results[1].document.id).toBe(3); // Fuzzy match - distance 1
		expect(results[2].document.id).toBe(1); // Fuzzy match - distance 2
	});
});

describe('search', () => {
	const createSampleTable = () =>
		createTable([
			{ id: 1, title: 'Another Test', content: 'Hello again' },
			{ id: 2, title: 'Hello World', content: 'This is a test' },
			{ id: 3, title: 'Third Entry', content: 'More content here' },
		]);

	describe('index building and searching', () => {
		it('creates index with empty table', () => {
			const emptyTable = createTable([] as { id: number; title: string }[]);
			const searchIndex = createSearchIndex(emptyTable, ['title']);
			expect(search(emptyTable, searchIndex, 'any')).toEqual([]);
		});

		it('creates index with one record', () => {
			const singleRecordTable = createTable([
				{ id: 1, title: 'Single Record' },
			]);
			const searchIndex = createSearchIndex(singleRecordTable, ['title']);
			expect(search(singleRecordTable, searchIndex, 'single')).toHaveLength(1);
		});

		it('creates index with multiple records', () => {
			const table = createSampleTable();
			const searchIndex = createSearchIndex(table, ['title', 'content']);
			expect(search(table, searchIndex, 'hello')).toHaveLength(2);
		});

		it('handles subset of columns', () => {
			const table = createSampleTable();
			const searchIndex = createSearchIndex(table, ['title']);
			expect(search(table, searchIndex, 'test')).toHaveLength(1);
		});

		it('ignores non-existent columns', () => {
			const table = createSampleTable();
			const searchIndex = createSearchIndex(table, [
				'title',
				// @ts-expect-error - Testing runtime behavior with invalid column
				'nonexistent',
			]);
			expect(search(table, searchIndex, 'hello')).toHaveLength(1);
		});
	});

	describe('search function', () => {
		const table = createSampleTable();
		const searchIndex = createSearchIndex(table, ['title', 'content']);

		it('returns empty array for empty search terms', () => {
			expect(search(table, searchIndex, '')).toEqual([]);
		});

		it('finds single term in index', () => {
			expect(search(table, searchIndex, 'hello')).toHaveLength(2);
		});

		it('returns empty array for non-existent term', () => {
			expect(search(table, searchIndex, 'nonexistent')).toEqual([]);
		});

		it('finds multiple terms with varying term frequencies', () => {
			const table = createTable([
				{ text: 'number number one' },
				{ text: 'one one one' },
				{ text: 'number one one' },
			]);
			const searchIndex = createSearchIndex(table, ['text']);
			const result = search(table, searchIndex, 'one');

			expect(result).toEqual([
				// Ordered by BM25 score
				{
					id: 1,
					document: {
						text: 'one one one',
					},
					matchedTokens: ['one'],
					score: 0.22255232104087094,
				},
				{
					id: 2,
					document: {
						text: 'number one one',
					},
					matchedTokens: ['one'],
					score: 0.1907591323207465,
				},
				{
					id: 0,
					document: {
						text: 'number number one',
					},
					matchedTokens: ['one'],
					score: 0.13353139262452257,
				},
			]);
		});

		it('finds multiple terms with varying document frequencies', () => {
			const table = createTable([{ text: 'one one' }, { text: 'number one' }]);
			const searchIndex = createSearchIndex(table, ['text']);
			const result = search(table, searchIndex, 'number one');

			expect(result).toEqual([
				// Ordered by BM25 score
				{
					id: 1,
					document: {
						text: 'number one',
					},
					matchedTokens: ['number', 'one'],
					score: 0.8754687373538999,
				},
				{
					id: 0,
					document: {
						text: 'one one',
					},
					matchedTokens: ['one'],
					score: 0.26045936684850657,
				},
			]);
		});

		it('finds multiple terms with varying document lengths', () => {
			const table = createTable([
				{ text: 'number one number number' },
				{ text: 'number one' },
				{ text: 'number one number' },
			]);
			const searchIndex = createSearchIndex(table, ['text']);
			const result = search(table, searchIndex, 'one');

			expect(result).toEqual([
				// Ordered by BM25 score
				{
					id: 1,
					document: {
						text: 'number one',
					},
					matchedTokens: ['one'],
					score: 0.15709575602885006,
				},
				{
					id: 2,
					document: {
						text: 'number one number',
					},
					matchedTokens: ['one'],
					score: 0.13353139262452257,
				},
				{
					id: 0,
					document: {
						text: 'number one number number',
					},
					matchedTokens: ['one'],
					score: 0.11611425445610657,
				},
			]);
		});

		it('handles terms not in index', () => {
			expect(search(table, searchIndex, 'hello nonexistent')).toHaveLength(2);
		});

		it('is case insensitive', () => {
			expect(search(table, searchIndex, 'HELLO')).toHaveLength(2);
		});

		it('handles punctuation in search terms', () => {
			expect(search(table, searchIndex, 'hello,')).toHaveLength(2);
		});

		it('handles search term tokenization', () => {
			expect(search(table, searchIndex, "doesn't")).toHaveLength(0);
		});
	});

	describe('edge cases', () => {
		it('handles unicode characters', () => {
			const tableWithUnicode = createTable([{ id: 1, title: '你好世界' }]);
			const searchIndex = createSearchIndex(tableWithUnicode, ['title']);
			expect(search(tableWithUnicode, searchIndex, '你好')).toHaveLength(1);
		});

		it('handles emojis', () => {
			const tableWithEmojis = createTable([{ id: 1, title: 'Hello 🌍' }]);
			const searchIndex = createSearchIndex(tableWithEmojis, ['title']);
			expect(search(tableWithEmojis, searchIndex, 'hello')).toHaveLength(1);
			expect(search(tableWithEmojis, searchIndex, '🌍')).toHaveLength(0);
		});
	});
});

describe('highlightSearchResult', () => {
	const createSampleTable = () =>
		createTable([
			{ id: '1', title: 'Another Test', content: 'Hello again' },
			{ id: '2', title: 'Hello World', content: 'This is a test' },
			{ id: '3', title: 'Third Entry', content: 'More content here' },
		]);

	const table = createSampleTable();
	const searchIndex = createSearchIndex(table, ['title', 'content']);

	it('highlights matched tokens in a search result', () => {
		const [result] = search(table, searchIndex, 'hello');
		assert(result);
		const highlightedResult = highlightSearchResult(result, [
			'id',
			'content',
			'title',
		]);
		expect(highlightedResult).toEqual({
			id: [['1', false]],
			title: [
				['Another', false],
				[' ', false],
				['Test', false],
			],
			content: [
				['Hello', true],
				[' ', false],
				['again', false],
			],
		});
	});

	it('handles case-insensitive matching', () => {
		const [result] = search(table, searchIndex, 'HELLO');
		assert(result);
		const highlightedResult = highlightSearchResult(result, [
			'id',
			'content',
			'title',
		]);
		expect(highlightedResult).toEqual({
			id: [['1', false]],
			title: [
				['Another', false],
				[' ', false],
				['Test', false],
			],
			content: [
				['Hello', true],
				[' ', false],
				['again', false],
			],
		});
	});

	it('handles punctuation in the text', () => {
		const tableWithPunctuation = createTable([
			{ id: '1', title: 'Hello, World!' },
		]);
		const searchIndex = createSearchIndex(tableWithPunctuation, ['title']);
		const [result] = search(tableWithPunctuation, searchIndex, 'hello');
		assert(result);
		const highlightedResult = highlightSearchResult(result, ['id', 'title']);
		expect(highlightedResult).toEqual({
			id: [['1', false]],
			title: [
				['Hello', true],
				[',', false],
				[' ', false],
				['World', false],
				['!', false],
			],
		});
	});

	it('handles unicode characters', () => {
		const tableWithUnicode = createTable([{ id: '1', title: '你好世界' }]);
		const searchIndex = createSearchIndex(tableWithUnicode, ['title']);
		const [result] = search(tableWithUnicode, searchIndex, '你好');
		assert(result);
		const highlightedResult = highlightSearchResult(result, ['id', 'title']);
		expect(highlightedResult).toEqual({
			id: [['1', false]],
			title: [
				['你好', true],
				['世界', true], // fuzzy match
			],
		});
	});

	it('handles emojis', () => {
		const tableWithEmojis = createTable([{ id: '1', title: 'Hello 🌍' }]);
		const searchIndex = createSearchIndex(tableWithEmojis, ['title']);
		const [result] = search(tableWithEmojis, searchIndex, 'hello');
		assert(result);
		const highlightedResult = highlightSearchResult(result, ['id', 'title']);
		expect(highlightedResult).toEqual({
			id: [['1', false]],
			title: [
				['Hello', true],
				[' ', false],
				['🌍', false],
			],
		});
	});
});

describe('highlightFirst', () => {
	it('highlights matched token in a single sentence', () => {
		const table = createTable([{ title: 'The blue dogs.' }]);
		const searchIndex = createSearchIndex(table, ['title']);
		const [result] = search(table, searchIndex, 'dogs');
		assert(result);
		const highlightedResult = highlightFlattenColumns(result, ['title']);
		expect(highlightedResult).toEqual([
			['The', false],
			[' ', false],
			['blue', false],
			[' ', false],
			['dogs', true],
			['.', false],
		]);
	});

	it('handles multiple matched tokens in a single sentence', () => {
		const table = createTable([{ title: 'The blue dogs.' }]);
		const searchIndex = createSearchIndex(table, ['title']);
		const [result] = search(table, searchIndex, 'blue dogs');
		assert(result);
		const highlightedResult = highlightFlattenColumns(result, ['title']);
		expect(highlightedResult).toEqual([
			['The', false],
			[' ', false],
			['blue', true],
			[' ', false],
			['dogs', true],
			['.', false],
		]);
	});

	it('highlights matched token in multiple sentences', () => {
		const table = createTable([{ title: 'The blue dogs. The green dogs.' }]);
		const searchIndex = createSearchIndex(table, ['title']);
		const [result] = search(table, searchIndex, 'dogs');
		assert(result);
		const highlightedResult = highlightFlattenColumns(result, ['title']);
		expect(highlightedResult).toEqual([
			['The', false],
			[' ', false],
			['blue', false],
			[' ', false],
			['dogs', true],
			['.', false],
			[' ', false],
			['The', false],
			[' ', false],
			['green', false],
			[' ', false],
			['dogs', true],
			['.', false],
		]);
	});

	it('handles multiple matched tokens in a single sentence', () => {
		const table = createTable([{ title: 'The blue dogs. The green dogs.' }]);
		const searchIndex = createSearchIndex(table, ['title']);
		const [result] = search(table, searchIndex, 'blue dogs');
		assert(result);
		const highlightedResult = highlightFlattenColumns(result, ['title']);
		expect(highlightedResult).toEqual([
			['The', false],
			[' ', false],
			['blue', true],
			[' ', false],
			['dogs', true],
			['.', false],
			[' ', false],
			['The', false],
			[' ', false],
			['green', false],
			[' ', false],
			['dogs', true],
			['.', false],
		]);
	});

	it('handles multiple matched tokens in a multiple fields', () => {
		const table = createTable([
			{
				title: 'The blue dogs.',
				content: 'The green dogs.',
			},
		]);
		const searchIndex = createSearchIndex(table, ['title']);
		const [result] = search(table, searchIndex, 'blue dogs');
		assert(result);
		const highlightedResult = highlightFlattenColumns(result, [
			'title',
			'content',
		]);
		expect(highlightedResult).toEqual([
			['The', false],
			[' ', false],
			['blue', true],
			[' ', false],
			['dogs', true],
			['.', false],
			['The', false],
			[' ', false],
			['green', false],
			[' ', false],
			['dogs', true],
			['.', false],
		]);
	});

	it('highlights matched tokens case-insensitively', () => {
		const table = createTable([{ title: 'The BLUE DOGS bark.' }]);
		const searchIndex = createSearchIndex(table, ['title']);
		const [result] = search(table, searchIndex, 'blue dogs');
		assert(result);
		const highlightedResult = highlightFlattenColumns(result, ['title']);
		expect(highlightedResult).toEqual([
			['The', false],
			[' ', false],
			['BLUE', true],
			[' ', false],
			['DOGS', true],
			[' ', false],
			['bark', false],
			['.', false],
		]);
	});

	it('handles empty text', () => {
		const highlightedResult = highlightFlattenColumns(
			{
				document: {
					title: '',
					content: '',
				},
				matchedTokens: [],
				score: 0,
			},
			['content', 'title'],
		);
		expect(highlightedResult).toEqual([]);
	});

	it('handles text with no matches', () => {
		const highlightedResult = highlightFlattenColumns(
			{
				document: {
					title: 'foo bar',
					content: 'bar baz',
				},
				matchedTokens: ['qux'],
				score: 0,
			},
			['content', 'title'],
		);
		expect(highlightedResult).toEqual([]);
	});

	it('respects the padStart starting in the current sentence', () => {
		const table = createTable([
			{ title: 'One two three four five six seven eight.' },
		]);
		const searchIndex = createSearchIndex(table, ['title']);
		const [result] = search(table, searchIndex, 'six');
		assert(result);
		const highlightedResult = highlightFlattenColumns(result, ['title'], {
			padStart: 3,
		});
		expect(highlightedResult).toEqual([
			['three', false],
			[' ', false],
			['four', false],
			[' ', false],
			['five', false],
			[' ', false],
			['six', true],
			[' ', false],
			['seven', false],
			[' ', false],
			['eight', false],
			['.', false],
		]);
	});

	it('respects the padStart starting in the previous sentence', () => {
		const table = createTable([
			{ title: 'Five six seven eight. One two three four five.' },
		]);
		const searchIndex = createSearchIndex(table, ['title']);
		const [result] = search(table, searchIndex, 'two');
		assert(result);
		const highlightedResult = highlightFlattenColumns(result, ['title'], {
			padStart: 3,
		});
		expect(highlightedResult).toEqual([
			['seven', false],
			[' ', false],
			['eight', false],
			['.', false],
			[' ', false],
			['One', false],
			[' ', false],
			['two', true],
			[' ', false],
			['three', false],
			[' ', false],
			['four', false],
			[' ', false],
			['five', false],
			['.', false],
		]);
	});

	it('respects the matchLength ending in the current sentence', () => {
		const table = createTable([
			{ title: 'One two three four five six seven eight.' },
		]);
		const searchIndex = createSearchIndex(table, ['title']);
		const [result] = search(table, searchIndex, 'two');
		assert(result);
		const highlightedResult = highlightFlattenColumns(result, ['title'], {
			matchLength: 5,
		});
		expect(highlightedResult).toEqual([
			['One', false],
			[' ', false],
			['two', true],
			[' ', false],
			['three', false],
			[' ', false],
			['four', false],
			[' ', false],
			['five', false],
		]);
	});

	it('respects the matchLength ending in the next sentence', () => {
		const table = createTable([
			{ title: 'One two three four. Five six seven eight.' },
		]);
		const searchIndex = createSearchIndex(table, ['title']);
		const [result] = search(table, searchIndex, 'two six');
		assert(result);
		const highlightedResult = highlightFlattenColumns(result, ['title'], {
			matchLength: 7,
		});
		expect(highlightedResult).toEqual([
			['One', false],
			[' ', false],
			['two', true],
			[' ', false],
			['three', false],
			[' ', false],
			['four', false],
			['.', false],
			[' ', false],
			['Five', false],
			[' ', false],
			['six', true],
			[' ', false],
			['seven', false],
		]);
	});
});
