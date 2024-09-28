import { describe, expectTypeOf, it } from 'vitest';
import { createTable } from './table.js';

describe('createTable', () => {
	it('should not allow record types', () => {
		type Item = { id: 1; name: 'Alice' };
		const ct = createTable<Item>;
		const expected = (records: Item[]) => ({ records });
		expectTypeOf(ct).toEqualTypeOf<typeof expected>();
	});

	it('should not allow union types', () => {
		const ct = createTable<{ id: 1; name: 'Alice' } | { id: 2; name: 'Bob' }>;
		const expected = (records: never[]) => ({ records });
		expectTypeOf(ct).toEqualTypeOf<typeof expected>();
	});

	it('should raise type errors for invalid inputs', () => {
		createTable<{ id: string }>([
			{
				// @ts-expect-error field type mismatch
				id: 1,
			},
		]);

		createTable<{ id: string }>([
			{
				// @ts-expect-error field name mismatch
				notId: 1,
			},
		]);
	});
});
