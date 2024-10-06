import { describe, it, expect } from 'vitest';
import { execute, filter } from './filter.js';
import { createTable } from './table.js';

describe('query', () => {
	const userRecords = [
		{ id: 1, name: 'Alice', age: 30 },
		{ id: 2, name: 'Bob', age: 25 },
		{ id: 3, name: 'Charlie', age: 35 },
	];
	const userTable = createTable(userRecords);

	describe('basic', () => {
		it('should return all records when no conditions are applied', () => {
			const result = execute(filter(userTable));
			expect(result).toEqual(userRecords);
		});
	});

	describe('where', () => {
		const valueTable = createTable([
			{ id: 1, value: 10 },
			{ id: 2, value: 20 },
			{ id: 3, value: 30 },
			{ id: 4, value: 40 },
			{ id: 5, value: 50 },
		]);

		it('should correctly filter records using where clause', () => {
			const result = execute(
				filter(valueTable).where((record) => record.value < 30),
			);
			expect(result).toEqual([
				{ id: 1, value: 10 },
				{ id: 2, value: 20 },
			]);
		});

		it('should return an empty array when no records match the condition', () => {
			const result = execute(filter(userTable).where((user) => user.age > 100));
			expect(result).toEqual([]);
		});
	});

	describe('with', () => {
		const userWithComputedFields = createTable([
			{ firstName: 'Alice', lastName: 'Bea', age: 30 },
			{ firstName: 'Bob', lastName: 'Smith', age: 17 },
			{ firstName: 'Kim', lastName: 'Cho', age: 25 },
		]);

		it('should include specified computed fields when using with()', () => {
			const result = execute(
				filter(userWithComputedFields).with({
					fullName: (user) => `${user.firstName} ${user.lastName}`,
				}),
			);
			expect(result[0]).toHaveProperty('fullName', 'Alice Bea');
		});

		it('should include multiple computed fields when specified', () => {
			const result = execute(
				filter(userWithComputedFields).with({
					fullName: (user) => `${user.firstName} ${user.lastName}`,
					isAdult: (user) => user.age >= 18,
				}),
			);
			expect(result[0]).toHaveProperty('fullName', 'Alice Bea');
			expect(result[0]).toHaveProperty('isAdult', true);
		});

		it('should work correctly with where() and with() combined', () => {
			const result = execute(
				filter(userWithComputedFields)
					.where((user) => user.age >= 25)
					.with({
						fullName: (user) => `${user.firstName} ${user.lastName}`,
					}),
			);
			expect(result).toEqual([
				{
					firstName: 'Alice',
					lastName: 'Bea',
					age: 30,
					fullName: 'Alice Bea',
				},
				{
					firstName: 'Kim',
					lastName: 'Cho',
					age: 25,
					fullName: 'Kim Cho',
				},
			]);
		});
	});

	describe('limit', () => {
		const numberTable = createTable([
			{ id: 1, value: 10 },
			{ id: 2, value: 20 },
			{ id: 3, value: 30 },
			{ id: 4, value: 40 },
			{ id: 5, value: 50 },
		]);

		it('should limit the number of records returned', () => {
			const result = execute(filter(numberTable).limit(3));
			expect(result).toEqual([
				{ id: 1, value: 10 },
				{ id: 2, value: 20 },
				{ id: 3, value: 30 },
			]);
		});

		it('should return all records when limit is greater than the number of records', () => {
			const result = execute(filter(numberTable).limit(10));
			expect(result).toEqual([
				{ id: 1, value: 10 },
				{ id: 2, value: 20 },
				{ id: 3, value: 30 },
				{ id: 4, value: 40 },
				{ id: 5, value: 50 },
			]);
		});

		it('should return an empty array when limit is 0', () => {
			const result = execute(filter(numberTable).limit(0));
			expect(result).toEqual([]);
		});

		it('should ignore negative limit values', () => {
			const result = execute(filter(numberTable).limit(-3));
			expect(result).toEqual([
				{ id: 1, value: 10 },
				{ id: 2, value: 20 },
				{ id: 3, value: 30 },
				{ id: 4, value: 40 },
				{ id: 5, value: 50 },
			]);
		});

		it('should work correctly with where() and limit() combined', () => {
			const result = execute(
				filter(numberTable)
					.where((record) => record.value > 20)
					.limit(2),
			);
			expect(result).toEqual([
				{ id: 3, value: 30 },
				{ id: 4, value: 40 },
			]);
		});

		it('should work correctly with with(), where(), and limit() combined', () => {
			const result = execute(
				filter(numberTable)
					.where((record) => record.value > 20)
					.with({
						doubled: (record) => record.value * 2,
					})
					.limit(2),
			);
			expect(result).toEqual([
				{ id: 3, value: 30, doubled: 60 },
				{ id: 4, value: 40, doubled: 80 },
			]);
		});
	});
});
