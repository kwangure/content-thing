import { describe, expectTypeOf, it } from 'vitest';
import { createTable, type Table } from './table.js';
import { number, string } from './column.js';
import { execute, query } from './database.js';

describe('createTable', () => {
	it('should create correct Table type', () => {
		const table = createTable(
			{
				id: number('id'),
				name: string('name'),
			},
			[{ id: 1, name: 'Alice' }],
		);

		expectTypeOf(table).toMatchTypeOf<
			Table<{
				id: number;
				name: string;
			}>
		>();

		expectTypeOf(table).not.toMatchTypeOf<
			Table<{
				id: string;
				name: number;
			}>
		>();
	});
	it('should correctly infer computed field types', () => {
		const table = createTable(
			{
				id: number('id'),
				name: string('name'),
			},
			[{ id: 1, name: 'Alice' }],
		);
		expectTypeOf(execute(query(table))).toEqualTypeOf<
			{
				id: number;
				name: string;
			}[]
		>();

		expectTypeOf(
			execute(query(table).with({ fullName: (record) => record.name })),
		).toEqualTypeOf<
			{
				id: number;
				name: string;
				fullName: string;
			}[]
		>();
	});

	describe('Empty Table', () => {
		it('should handle tables with no columns and no computed fields', () => {
			/* eslint-disable-next-line @typescript-eslint/ban-types */
			const emptyTable = createTable({}, []);
			/* eslint-disable-next-line @typescript-eslint/ban-types */
			expectTypeOf(emptyTable).toMatchTypeOf<Table<{}>>();
		});
	});

	describe('Invalid Inputs', () => {
		it('should raise type errors for invalid inputs', () => {
			createTable({ id: string('id') }, [{ id: '' }]);

			createTable(
				{
					id: string('id'),
				},
				[
					{
						// @ts-expect-error field type mismatch
						id: 1,
					},
				],
			);

			createTable(
				{
					id: number('id'),
				},
				[
					{
						// @ts-expect-error field name mismatch
						notId: 1,
					},
				],
			);
		});
	});
});
