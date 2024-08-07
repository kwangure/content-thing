import { assert, describe, expect, it } from 'vitest';
import {
	createSearchIndex,
	highlightFirst,
	highlightSearchResult,
	search,
	tokenize,
} from './search.js';
import { createTable } from './table.js';
import { number, string, type ColumnType } from './column.js';

describe('tokenize', () => {
	it('tokenizes simple English words', () => {
		expect(tokenize('hello world')).toEqual(['hello', 'world']);
	});

	it('handles contractions', () => {
		expect(tokenize("don't I'm")).toEqual(["don't", "i'm"]);
	});

	it('handles punctuation', () => {
		expect(tokenize('Hello, world!')).toEqual(['hello', 'world']);
	});

	it('handles numbers and special characters', () => {
		expect(tokenize('abc123 @#$')).toEqual(['abc123']);
	});

	it('handles empty string', () => {
		expect(tokenize('')).toEqual([]);
	});

	it('handles string with only spaces', () => {
		expect(tokenize('   ')).toEqual([]);
	});

	it('handles string with only non-word characters', () => {
		expect(tokenize('@#$%')).toEqual([]);
	});
});

describe('search', () => {
	const createSampleTable = () =>
		createTable(
			{
				id: number('id'),
				title: string('title'),
				content: string('content'),
			},
			[
				{ id: 1, title: 'Another Test', content: 'Hello again' },
				{ id: 2, title: 'Hello World', content: 'This is a test' },
				{ id: 3, title: 'Third Entry', content: 'More content here' },
			],
		);

	describe('index building and searching', () => {
		it('creates index with empty table', () => {
			const emptyTable = createTable(
				{ id: number('id'), title: string('title') },
				[],
			);
			const { invertedIndex, documentLengths, averageDocumentLength } =
				createSearchIndex(emptyTable, { title: (s) => s });
			expect(
				search(
					emptyTable,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'any',
				),
			).toEqual([]);
		});

		it('creates index with one record', () => {
			const singleRecordTable = createTable(
				{ id: number('id'), title: string('title') },
				[{ id: 1, title: 'Single Record' }],
			);
			const { invertedIndex, documentLengths, averageDocumentLength } =
				createSearchIndex(singleRecordTable, { title: (s) => s });
			expect(
				search(
					singleRecordTable,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'single',
				),
			).toHaveLength(1);
		});

		it('creates index with multiple records', () => {
			const table = createSampleTable();
			const { invertedIndex, documentLengths, averageDocumentLength } =
				createSearchIndex(table, {
					title: (s) => s,
					content: (s) => s,
				});
			expect(
				search(
					table,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'hello',
				),
			).toHaveLength(2);
		});

		it('handles subset of columns', () => {
			const table = createSampleTable();
			const { invertedIndex, documentLengths, averageDocumentLength } =
				createSearchIndex(table, { title: (s) => s });
			expect(
				search(
					table,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'test',
				),
			).toHaveLength(1);
		});

		it('ignores non-existent columns', () => {
			const table = createSampleTable();
			const { invertedIndex, documentLengths, averageDocumentLength } =
				createSearchIndex(table, {
					title: (s) => s,
					// @ts-expect-error - Testing runtime behavior with invalid column
					nonexistent: (s) => s,
				});
			expect(
				search(
					table,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'hello',
				),
			).toHaveLength(1);
		});
	});

	describe('search function', () => {
		const table = createSampleTable();
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(table, {
				title: (s) => s,
				content: (s) => s,
			});

		it('returns empty array for empty search terms', () => {
			expect(
				search(
					table,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'',
				),
			).toEqual([]);
		});

		it('finds single term in index', () => {
			expect(
				search(
					table,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'hello',
				),
			).toHaveLength(2);
		});

		it('returns empty array for non-existent term', () => {
			expect(
				search(
					table,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'nonexistent',
				),
			).toEqual([]);
		});

		it('finds multiple terms with varying term frequencies', () => {
			const table = createTable(
				{
					text: string('title'),
				},
				[
					{ text: 'number number one' },
					{ text: 'one one one' },
					{ text: 'number one one' },
				],
			);
			const { invertedIndex, documentLengths, averageDocumentLength } =
				createSearchIndex(table, { text: (s) => s });
			const result = search(
				table,
				invertedIndex,
				documentLengths,
				averageDocumentLength,
				'one',
			);

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
			const table = createTable(
				{
					text: string('title'),
				},
				[{ text: 'one one' }, { text: 'number one' }],
			);
			const { invertedIndex, documentLengths, averageDocumentLength } =
				createSearchIndex(table, { text: (s) => s });
			const result = search(
				table,
				invertedIndex,
				documentLengths,
				averageDocumentLength,
				'number one',
			);

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
			const table = createTable(
				{
					text: string('title'),
				},
				[
					{ text: 'number one number number' },
					{ text: 'number one' },
					{ text: 'number one number' },
				],
			);
			const { invertedIndex, documentLengths, averageDocumentLength } =
				createSearchIndex(table, { text: (s) => s });
			const result = search(
				table,
				invertedIndex,
				documentLengths,
				averageDocumentLength,
				'one',
			);

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
			expect(
				search(
					table,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'hello nonexistent',
				),
			).toHaveLength(2);
		});

		it('is case insensitive', () => {
			expect(
				search(
					table,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'HELLO',
				),
			).toHaveLength(2);
		});

		it('does not match partial words', () => {
			expect(
				search(
					table,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'wo',
				),
			).toHaveLength(0);
		});

		it('handles punctuation in search terms', () => {
			expect(
				search(
					table,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'hello,',
				),
			).toHaveLength(2);
		});

		it('handles search term tokenization', () => {
			expect(
				search(
					table,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					"doesn't",
				),
			).toHaveLength(0);
		});
	});

	describe('edge cases', () => {
		it('handles null values in records', () => {
			const tableWithNull = createTable<{
				id: ColumnType<'id', number>;
				title: ColumnType<'title', string | null>;
			}>({ id: number('id'), title: string('title') }, [
				{ id: 1, title: null },
			]);
			const { invertedIndex, documentLengths, averageDocumentLength } =
				createSearchIndex(tableWithNull, { title: (s) => s ?? '' });
			expect(
				search(
					tableWithNull,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'null',
				),
			).toHaveLength(0);
		});

		it('handles undefined values in records', () => {
			const tableWithUndefined = createTable<{
				id: ColumnType<'id', number>;
				title: ColumnType<'title', string | undefined>;
			}>({ id: number('id'), title: string('title') }, [
				{ id: 1, title: undefined },
			]);
			const { invertedIndex, documentLengths, averageDocumentLength } =
				createSearchIndex(tableWithUndefined, {
					title: (s) => s ?? '',
				});
			expect(
				search(
					tableWithUndefined,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'undefined',
				),
			).toHaveLength(0);
		});

		it('handles non-string values in specified columns', () => {
			const tableWithNumbers = createTable(
				{ id: number('id'), count: number('count') },
				[{ id: 1, count: 42 }],
			);
			const { invertedIndex, documentLengths, averageDocumentLength } =
				createSearchIndex(tableWithNumbers, {
					count: (s) => String(s),
				});
			expect(
				search(
					tableWithNumbers,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'42',
				),
			).toHaveLength(1);
		});

		it('handles unicode characters', () => {
			const tableWithUnicode = createTable(
				{ id: number('id'), title: string('title') },
				[{ id: 1, title: '你好世界' }],
			);
			const { invertedIndex, documentLengths, averageDocumentLength } =
				createSearchIndex(tableWithUnicode, { title: (s) => s });
			expect(
				search(
					tableWithUnicode,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'你好',
				),
			).toHaveLength(1);
		});

		it('handles emojis', () => {
			const tableWithEmojis = createTable(
				{ id: number('id'), title: string('title') },
				[{ id: 1, title: 'Hello 🌍' }],
			);
			const { invertedIndex, documentLengths, averageDocumentLength } =
				createSearchIndex(tableWithEmojis, { title: (s) => s });
			expect(
				search(
					tableWithEmojis,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'hello',
				),
			).toHaveLength(1);
			expect(
				search(
					tableWithEmojis,
					invertedIndex,
					documentLengths,
					averageDocumentLength,
					'🌍',
				),
			).toHaveLength(0);
		});
	});
});

describe('highlightSearchResult', () => {
	const createSampleTable = () =>
		createTable(
			{
				id: number('id'),
				title: string('title'),
				content: string('content'),
			},
			[
				{ id: 1, title: 'Another Test', content: 'Hello again' },
				{ id: 2, title: 'Hello World', content: 'This is a test' },
				{ id: 3, title: 'Third Entry', content: 'More content here' },
			],
		);

	const table = createSampleTable();
	const { invertedIndex, documentLengths, averageDocumentLength } =
		createSearchIndex(table, {
			title: (s) => s,
			content: (s) => s,
		});

	it('highlights matched tokens in a search result', () => {
		const [result] = search(
			table,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'hello',
		);
		assert(result);
		const highlightedResult = highlightSearchResult(result, {
			id: (s) => String(s),
			title: (s) => s,
			content: (s) => s,
		});
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
		const [result] = search(
			table,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'HELLO',
		);
		assert(result);
		const highlightedResult = highlightSearchResult(result, {
			id: (s) => String(s),
			title: (s) => s,
			content: (s) => s,
		});
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
		const tableWithPunctuation = createTable(
			{ id: number('id'), title: string('title') },
			[{ id: 1, title: 'Hello, World!' }],
		);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(tableWithPunctuation, { title: (s) => s });
		const [result] = search(
			tableWithPunctuation,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'hello',
		);
		assert(result);
		const highlightedResult = highlightSearchResult(result, {
			id: (s) => String(s),
			title: (s) => s,
		});
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

	it('handles non-string values in the record', () => {
		const tableWithNumbers = createTable(
			{ id: number('id'), count: number('count') },
			[{ id: 1, count: 42 }],
		);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(tableWithNumbers, { count: (s) => String(s) });
		const [result] = search(
			tableWithNumbers,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'42',
		);
		assert(result);
		const highlightedResult = highlightSearchResult(result, {
			id: (s) => String(s),
			count: (s) => String(s),
		});
		expect(highlightedResult).toEqual({
			id: [['1', false]],
			count: [['42', true]],
		});
	});

	it('handles unicode characters', () => {
		const tableWithUnicode = createTable(
			{ id: number('id'), title: string('title') },
			[{ id: 1, title: '你好世界' }],
		);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(tableWithUnicode, { title: (s) => s });
		const [result] = search(
			tableWithUnicode,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'你好',
		);
		assert(result);
		const highlightedResult = highlightSearchResult(result, {
			id: (s) => String(s),
			title: (s) => s,
		});
		expect(highlightedResult).toEqual({
			id: [['1', false]],
			title: [
				['你好', true],
				['世界', false],
			],
		});
	});

	it('handles emojis', () => {
		const tableWithEmojis = createTable(
			{ id: number('id'), title: string('title') },
			[{ id: 1, title: 'Hello 🌍' }],
		);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(tableWithEmojis, { title: (s) => s });
		const [result] = search(
			tableWithEmojis,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'hello',
		);
		assert(result);
		const highlightedResult = highlightSearchResult(result, {
			id: (s) => String(s),
			title: (s) => s,
		});
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
		const table = createTable({ title: string('title') }, [
			{ title: 'The blue dogs.' },
		]);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(table, { title: (s) => s });
		const [result] = search(
			table,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'dogs',
		);
		assert(result);
		const highlightedResult = highlightFirst(result, { title: (s) => s });
		expect(highlightedResult).toEqual([
			{
				words: [
					['The', false],
					[' ', false],
					['blue', false],
					[' ', false],
					['dogs', true],
					['.', false],
				],
			},
		]);
	});

	it('handles multiple matched tokens in a single sentence', () => {
		const table = createTable({ title: string('title') }, [
			{ title: 'The blue dogs.' },
		]);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(table, { title: (s) => s });
		const [result] = search(
			table,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'blue dogs',
		);
		assert(result);
		const highlightedResult = highlightFirst(result, { title: (s) => s });
		expect(highlightedResult).toEqual([
			{
				words: [
					['The', false],
					[' ', false],
					['blue', true],
					[' ', false],
					['dogs', true],
					['.', false],
				],
			},
		]);
	});

	it('highlights matched token in multiple sentences', () => {
		const table = createTable({ title: string('title') }, [
			{ title: 'The blue dogs. The green dogs.' },
		]);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(table, { title: (s) => s });
		const [result] = search(
			table,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'dogs',
		);
		assert(result);
		const highlightedResult = highlightFirst(result, { title: (s) => s });
		expect(highlightedResult).toEqual([
			{
				words: [
					['The', false],
					[' ', false],
					['blue', false],
					[' ', false],
					['dogs', true],
					['.', false],
					[' ', false],
				],
			},
			{
				words: [
					['The', false],
					[' ', false],
					['green', false],
					[' ', false],
					['dogs', true],
					['.', false],
				],
			},
		]);
	});

	it('handles multiple matched tokens in a single sentence', () => {
		const table = createTable({ title: string('title') }, [
			{ title: 'The blue dogs. The green dogs.' },
		]);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(table, { title: (s) => s });
		const [result] = search(
			table,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'blue dogs',
		);
		assert(result);
		const highlightedResult = highlightFirst(result, { title: (s) => s });
		expect(highlightedResult).toEqual([
			{
				words: [
					['The', false],
					[' ', false],
					['blue', true],
					[' ', false],
					['dogs', true],
					['.', false],
					[' ', false],
				],
			},
			{
				words: [
					['The', false],
					[' ', false],
					['green', false],
					[' ', false],
					['dogs', true],
					['.', false],
				],
			},
		]);
	});

	it('handles multiple matched tokens in a multiple fields', () => {
		const table = createTable(
			{ title: string('title'), content: string('title') },
			[
				{
					title: 'The blue dogs.',
					content: 'The green dogs.',
				},
			],
		);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(table, { title: (s) => s });
		const [result] = search(
			table,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'blue dogs',
		);
		assert(result);
		const highlightedResult = highlightFirst(result, {
			title: (s) => s,
			content: (s) => s,
		});
		expect(highlightedResult).toEqual([
			{
				words: [
					['The', false],
					[' ', false],
					['blue', true],
					[' ', false],
					['dogs', true],
					['.', false],
				],
			},
			{
				words: [
					['The', false],
					[' ', false],
					['green', false],
					[' ', false],
					['dogs', true],
					['.', false],
				],
			},
		]);
	});

	it('highlights matched tokens case-insensitively', () => {
		const table = createTable({ title: string('title') }, [
			{ title: 'The BLUE DOGS bark.' },
		]);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(table, { title: (s) => s });
		const [result] = search(
			table,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'blue dogs',
		);
		assert(result);
		const highlightedResult = highlightFirst(result, { title: (s) => s });
		expect(highlightedResult).toEqual([
			{
				words: [
					['The', false],
					[' ', false],
					['BLUE', true],
					[' ', false],
					['DOGS', true],
					[' ', false],
					['bark', false],
					['.', false],
				],
			},
		]);
	});

	it('handles empty text', () => {
		const highlightedResult = highlightFirst(
			{
				document: {
					title: '',
					content: '',
				},
				matchedTokens: [],
				score: 0,
			},
			{ title: (s) => s, content: (s) => s },
		);
		expect(highlightedResult).toEqual([]);
	});

	it('handles text with no matches', () => {
		const highlightedResult = highlightFirst(
			{
				document: {
					title: 'foo bar',
					content: 'bar baz',
				},
				matchedTokens: ['qux'],
				score: 0,
			},
			{ title: (s) => s, content: (s) => s },
		);
		expect(highlightedResult).toEqual([]);
	});

	it('handles non-string options', () => {
		const table = createTable({ value: number('value') }, [{ value: 42 }]);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(table, { value: (s) => String(s) });
		const [result] = search(
			table,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'42',
		);
		assert(result);
		const highlightedResult = highlightFirst(result, {
			value: (n) => String(n),
		});
		expect(highlightedResult).toEqual([
			{
				words: [['42', true]],
			},
		]);
	});

	it('respects the padStart starting in the current sentence', () => {
		const table = createTable({ title: string('title') }, [
			{ title: 'One two three four five six seven eight.' },
		]);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(table, { title: (s) => s });
		const [result] = search(
			table,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'six',
		);
		assert(result);
		const highlightedResult = highlightFirst(
			result,
			{ title: (s) => s },
			{ padStart: 3 },
		);
		expect(highlightedResult).toEqual([
			{
				words: [
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
				],
			},
		]);
	});

	it('respects the padStart starting in the previous sentence', () => {
		const table = createTable({ title: string('title') }, [
			{ title: 'Five six seven eight. One two three four five.' },
		]);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(table, { title: (s) => s });
		const [result] = search(
			table,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'two',
		);
		assert(result);
		const highlightedResult = highlightFirst(
			result,
			{ title: (s) => s },
			{ padStart: 3 },
		);
		expect(highlightedResult).toEqual([
			{
				words: [
					['seven', false],
					[' ', false],
					['eight', false],
					['.', false],
					[' ', false],
				],
			},
			{
				words: [
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
				],
			},
		]);
	});

	it('respects the matchLength ending in the current sentence', () => {
		const table = createTable({ title: string('title') }, [
			{ title: 'One two three four five six seven eight.' },
		]);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(table, { title: (s) => s });
		const [result] = search(
			table,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'two',
		);
		assert(result);
		const highlightedResult = highlightFirst(
			result,
			{ title: (s) => s },
			{ matchLength: 5 },
		);
		expect(highlightedResult).toEqual([
			{
				words: [
					['One', false],
					[' ', false],
					['two', true],
					[' ', false],
					['three', false],
					[' ', false],
					['four', false],
					[' ', false],
					['five', false],
				],
			},
		]);
	});

	it('respects the matchLength ending in the next sentence', () => {
		const table = createTable({ title: string('title') }, [
			{ title: 'One two three four. Five six seven eight.' },
		]);
		const { invertedIndex, documentLengths, averageDocumentLength } =
			createSearchIndex(table, { title: (s) => s });
		const [result] = search(
			table,
			invertedIndex,
			documentLengths,
			averageDocumentLength,
			'two six',
		);
		assert(result);
		const highlightedResult = highlightFirst(
			result,
			{ title: (s) => s },
			{ matchLength: 7 },
		);
		expect(highlightedResult).toEqual([
			{
				words: [
					['One', false],
					[' ', false],
					['two', true],
					[' ', false],
					['three', false],
					[' ', false],
					['four', false],
					['.', false],
					[' ', false],
				],
			},
			{
				words: [
					['Five', false],
					[' ', false],
					['six', true],
					[' ', false],
					['seven', false],
				],
			},
		]);
	});
});
