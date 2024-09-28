import { describe, expectTypeOf, it } from 'vitest';
import { execute, query } from './database.js';
import { createTable } from './table.js';

describe('query', () => {
	const userTable = createTable([{ id: 1, name: 'Alice', age: 30 }]);
	const postTable = createTable([{ id: 1, title: 'Hello', authorId: 1 }]);

	describe('select', () => {
		it('should only accept valid column names', () => {
			query(userTable).select('id', 'name', 'age');
			// @ts-expect-error non-existent column
			query(userTable).select('id', 'nonExistentColumn');
		});

		it('should correctly type the result when using .select()', () => {
			const result = execute(query(userTable).select('name', 'age'));
			expectTypeOf(result).toEqualTypeOf<{ name: string; age: number }[]>();

			const resultSingleColumn = execute(query(userTable).select('name'));
			expectTypeOf(resultSingleColumn).toEqualTypeOf<{ name: string }[]>();
		});

		it('should correctly type the result when combining .where() and .select()', () => {
			const result = execute(
				query(userTable)
					.where((user) => user.age > 18)
					.select('name', 'age'),
			);
			expectTypeOf(result).toEqualTypeOf<{ name: string; age: number }[]>();
		});

		it('should correctly type the result when combining .with() and .select()', () => {
			const userWithComputed = createTable([
				{ id: 1, firstName: 'Alice', lastName: 'Johnson', age: 30 },
			]);

			const result = execute(
				query(userWithComputed)
					.select('firstName', 'lastName')
					.with({
						fullName: (user) => `${user.firstName} ${user.lastName}`,
					}),
			);
			expectTypeOf(result).toEqualTypeOf<
				{ firstName: string; lastName: string; fullName: string }[]
			>();
		});

		it('should maintain correct types with optional properties and .select()', () => {
			const userWithOptional = createTable<{
				id: number;
				name: string;
				age?: number;
			}>([{ id: 1, name: 'Alice' }]);

			const result = execute(query(userWithOptional).select('name', 'age'));
			expectTypeOf(result).toEqualTypeOf<{ name: string; age?: number }[]>();
		});

		it('should correctly type the result when .select() is not used', () => {
			const result = execute(query(userTable));
			expectTypeOf(result).toEqualTypeOf<
				{ id: number; name: string; age: number }[]
			>();
		});
	});

	describe('where', () => {
		it('should only accept valid filters', () => {
			query(userTable).where(() => true);
			// @ts-expect-error non-existent column type
			query(userTable).where(() => undefined);
		});
	});

	describe('with', () => {
		const userWithComputed = createTable([
			{ firstName: 'Alice', lastName: 'Bea', age: 30 },
		]);

		it('should correctly type the result when using .with()', () => {
			const result = execute(
				query(userWithComputed).with({
					fullName: (user) => `${user.firstName} ${user.lastName}`,
				}),
			);
			expectTypeOf(result).toEqualTypeOf<
				{
					firstName: string;
					lastName: string;
					age: number;
					fullName: string;
				}[]
			>();

			const resultWithMultiple = execute(
				query(userWithComputed).with({
					fullName: (user) => `${user.firstName} ${user.lastName}`,
					isAdult: (user) => user.age >= 18,
				}),
			);
			expectTypeOf(resultWithMultiple).toEqualTypeOf<
				{
					firstName: string;
					lastName: string;
					age: number;
					fullName: string;
					isAdult: boolean;
				}[]
			>();
		});

		it('should correctly type computed field input', () => {
			execute(
				query(userWithComputed).with({
					fullName(user) {
						expectTypeOf(user).toEqualTypeOf<{
							firstName: string;
							lastName: string;
							age: number;
						}>();
					},
				}),
			);
		});

		it('should correctly type the result when combining .where() and .with()', () => {
			const result = execute(
				query(userWithComputed)
					.where((user) => user.age > 18)
					.with({
						fullName: (user) => `${user.firstName} ${user.lastName}`,
					}),
			);
			expectTypeOf(result).toEqualTypeOf<
				{
					firstName: string;
					lastName: string;
					age: number;
					fullName: string;
				}[]
			>();
		});

		it('should maintain correct types with optional properties and computed fields', () => {
			const userTable = createTable<{
				id: number;
				firstName: string;
				lastName: string;
				age?: number;
			}>([{ id: 1, firstName: 'Alice', lastName: 'Johnson' }]);

			const result = execute(
				query(userTable).with({
					fullName: (user) => `${user.firstName} ${user.lastName}`,
					isAdult: (user) => (user.age ?? 0) >= 18,
				}),
			);
			expectTypeOf(result).toEqualTypeOf<
				{
					id: number;
					firstName: string;
					lastName: string;
					age?: number;
					fullName: string;
					isAdult: boolean;
				}[]
			>();
		});
	});

	describe('execute', () => {
		it('should return an array of the correct type', () => {
			const users = execute(query(userTable));
			expectTypeOf(users).toEqualTypeOf<
				{ id: number; name: string; age: number }[]
			>();

			const posts = execute(query(postTable));
			expectTypeOf(posts).toEqualTypeOf<
				{ id: number; title: string; authorId: number }[]
			>();
			expectTypeOf(posts).not.toEqualTypeOf<
				{ id: number; title: string; authorId: string }[]
			>();
		});
	});

	describe('miscellaneous', () => {
		it('should handle tables with no columns', () => {
			const empty = createTable([]);
			const empties = execute(query(empty));
			expectTypeOf(empties).toEqualTypeOf<Record<string, never>[]>();
		});

		it('should handle tables with optional properties', () => {
			const user = createTable<{
				id: number;
				name: string;
				age?: number;
			}>([{ id: 1, name: 'Alice', age: 30 }]);
			expectTypeOf(execute(query(user))).toEqualTypeOf<
				{ id: number; name: string; age?: number }[]
			>();
		});
	});
});
