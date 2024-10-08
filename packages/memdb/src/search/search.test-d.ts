import { assert, describe, expectTypeOf, it } from 'vitest';
import { createSearchIndex, highlightSearchResult, search } from './search.js';
import { createTable } from '../table.js';

describe('highlightSearchResult', () => {
	const createSampleTable = () =>
		createTable([
			{ id: 1, title: 'Another Test', content: 'Hello again' },
			{ id: 2, title: 'Hello World', content: 'This is a test' },
			{ id: 3, title: 'Third Entry', content: 'More content here' },
		]);

	const table = createSampleTable();
	const searchIndex = createSearchIndex(table, ['content', 'title']);

	it('only highlights filtered columns', () => {
		const [result] = search(table, searchIndex, 'hello');
		assert(result);
		const highlightedResult = highlightSearchResult(result, ['content']);
		expectTypeOf(highlightedResult).toMatchTypeOf<{
			content: [string, number][];
		}>();
	});
});
