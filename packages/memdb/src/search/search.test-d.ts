import { assert, describe, expectTypeOf, it } from 'vitest';
import { createTable } from '../table.js';
import { createSearchIndex, highlightSearchResult, search } from './search.js';

describe('highlightSearchResult', () => {
	const createSampleTable = () =>
		createTable([
			{ id: 1, title: 'Another Test', content: 'Hello again' },
			{ id: 2, title: 'Hello World', content: 'This is a test' },
			{ id: 3, title: 'Third Entry', content: 'More content here' },
		]);

	const table = createSampleTable();
	const { invertedIndex, documentLengths, averageDocumentLength } =
		createSearchIndex(table, {
			title: (s) => s,
			content: (s) => s,
		});

	it('only highlights filtered columns', () => {
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
		});
		expectTypeOf(highlightedResult).toMatchTypeOf<{
			id: [string, boolean][];
		}>();
	});
});
