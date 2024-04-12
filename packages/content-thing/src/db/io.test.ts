import { describe, expect, it } from 'vitest';
import {
	generateIntegerColumn,
	generateJsonColumn,
	generateTextColumn,
} from './io.js';
import type { IntegerColumn, JsonColumn, TextColumn } from '../config/types.js';

describe('generateIntegerColumn', () => {
	it('should generate code for an integer column with no options', () => {
		const result = generateIntegerColumn(
			{
				type: 'integer',
			} as IntegerColumn,
			'id',
		);
		expect(result).toEqual('"id" INTEGER NOT NULL');
	});

	it('should generate code for a nullable integer column', () => {
		const result = generateIntegerColumn(
			{
				type: 'integer',
				nullable: true,
			},
			'id',
		);
		expect(result).toEqual('"id" INTEGER');
	});

	it('should generate code for a unique integer column with custom constraint name', () => {
		const result = generateIntegerColumn(
			{
				type: 'integer',
				unique: 'unique_id',
			} as IntegerColumn,
			'id',
		);
		expect(result).toEqual('"id" INTEGER NOT NULL CONSTRAINT unique_id UNIQUE');
	});

	it('should generate code for a unique integer column without custom constraint name', () => {
		const result = generateIntegerColumn(
			{
				type: 'integer',
				unique: true,
			} as IntegerColumn,
			'id',
		);
		expect(result).toEqual('"id" INTEGER NOT NULL UNIQUE');
	});

	it('should generate code for an integer column as primary key', () => {
		const result = generateIntegerColumn(
			{
				type: 'integer',
				primaryKey: true,
			} as IntegerColumn,
			'id',
		);
		expect(result).toEqual('"id" INTEGER NOT NULL PRIMARY KEY');
	});

	it('should generate code for an integer column with default value', () => {
		const result = generateIntegerColumn(
			{
				type: 'integer',
				defaultValue: 1,
			} as IntegerColumn,
			'id',
		);
		expect(result).toEqual('"id" INTEGER NOT NULL DEFAULT 1');
	});

	it('should generate code for an integer column with all options', () => {
		const result = generateIntegerColumn(
			{
				type: 'integer',
				primaryKey: true,
				unique: 'unique_id',
				defaultValue: 1,
				nullable: false,
			},
			'id',
		);
		expect(result).toEqual(
			'"id" INTEGER NOT NULL CONSTRAINT unique_id UNIQUE PRIMARY KEY DEFAULT 1',
		);
	});
});

describe('generateJsonColumn', () => {
	it('should generate code for a JSON column with no options', () => {
		const result = generateJsonColumn(
			{ type: 'json' } as JsonColumn,
			'json_data',
		);
		expect(result).toEqual('"json_data" TEXT NOT NULL');
	});

	it('should generate code for a nullable JSON column', () => {
		const result = generateJsonColumn(
			{
				type: 'json',
				nullable: true,
			} as JsonColumn,
			'json_data',
		);
		expect(result).toEqual('"json_data" TEXT');
	});

	it('should generate code for a unique JSON column', () => {
		const result = generateJsonColumn(
			{
				type: 'json',
				unique: true,
			} as JsonColumn,
			'json_data',
		);
		expect(result).toEqual('"json_data" TEXT NOT NULL UNIQUE');
	});

	it('should generate code for a unique JSON column with constraint name', () => {
		const result = generateJsonColumn(
			{
				type: 'json',
				unique: 'unique_json',
			} as JsonColumn,
			'json_data',
		);
		expect(result).toEqual(
			'"json_data" TEXT NOT NULL CONSTRAINT unique_json UNIQUE',
		);
	});

	it('should generate code for a JSON column as primary key', () => {
		const result = generateJsonColumn(
			{
				type: 'json',
				primaryKey: true,
			} as JsonColumn,
			'json_data',
		);
		expect(result).toEqual('"json_data" TEXT NOT NULL PRIMARY KEY');
	});

	it('should generate code for a JSON column with a default value', () => {
		const result = generateJsonColumn(
			{
				type: 'json',
				defaultValue: JSON.stringify({ key: 'value' }),
			} as JsonColumn,
			'json_data',
		);
		expect(result).toEqual(
			'"json_data" TEXT NOT NULL DEFAULT \'{"key":"value"}\'',
		);
	});

	it('should generate code for a JSON column with all options', () => {
		const result = generateJsonColumn(
			{
				type: 'json',
				primaryKey: true,
				nullable: false,
				unique: 'unique_json',
				defaultValue: JSON.stringify({ key: 'value' }),
			} as JsonColumn,
			'json_data',
		);
		expect(result).toEqual(
			'"json_data" TEXT NOT NULL CONSTRAINT unique_json UNIQUE PRIMARY KEY DEFAULT \'{"key":"value"}\'',
		);
	});
});

describe('generateTextColumn', () => {
	it('should generate code for a text column with no additional options', () => {
		const result = generateTextColumn({ type: 'text' } as TextColumn, 'name');
		expect(result).toEqual('"name" TEXT NOT NULL');
	});

	it('should generate code for a text column with length', () => {
		const result = generateTextColumn(
			{
				type: 'text',
				length: 50,
			} as TextColumn,
			'name',
		);
		expect(result).toEqual('"name" TEXT(50) NOT NULL');
	});

	it('should generate code for a text column with enum', () => {
		const result = generateTextColumn(
			{
				type: 'text',
				enum: ['A', 'B'],
			} as TextColumn,
			'name',
		);
		expect(result).toEqual(
			'"name" TEXT CHECK ("name" IN (\'A\', \'B\')) NOT NULL',
		);
	});

	it('should generate code for a text column with a default value', () => {
		const result = generateTextColumn(
			{
				type: 'text',
				defaultValue: 'abc',
			} as TextColumn,
			'name',
		);
		expect(result).toEqual('"name" TEXT NOT NULL DEFAULT \'abc\'');
	});

	it('should generate code for a text column as a primary key', () => {
		const result = generateTextColumn(
			{
				type: 'text',
				primaryKey: true,
			} as TextColumn,
			'name',
		);
		expect(result).toEqual('"name" TEXT NOT NULL PRIMARY KEY');
	});

	it('should generate code for a nullable text column', () => {
		const result = generateTextColumn(
			{
				type: 'text',
				nullable: true,
			} as TextColumn,
			'name',
		);
		expect(result).toEqual('"name" TEXT');
	});

	it('should generate code for a unique text column', () => {
		const result = generateTextColumn(
			{
				type: 'text',
				unique: 'unique_name',
			} as TextColumn,
			'name',
		);
		expect(result).toEqual(
			'"name" TEXT NOT NULL CONSTRAINT unique_name UNIQUE',
		);
	});

	it('should generate code for a text column with all options', () => {
		const result = generateTextColumn(
			{
				type: 'text',
				length: 50,
				enum: ['A', 'B'],
				defaultValue: 'A',
				primaryKey: true,
				nullable: false,
				unique: true,
			},
			'name',
		);
		expect(result).toEqual(
			"\"name\" TEXT(50) CHECK (\"name\" IN ('A', 'B')) NOT NULL UNIQUE PRIMARY KEY DEFAULT 'A'",
		);
	});

	it('handles single quotes in default value', () => {
		const result = generateTextColumn(
			{
				type: 'text',
				defaultValue: "O'Reilly",
			} as TextColumn,
			'name',
		);
		expect(result).toEqual(`"name" TEXT NOT NULL DEFAULT 'O''Reilly'`);
	});

	it('handles double quotes in default value', () => {
		const result = generateTextColumn(
			{
				type: 'text',
				defaultValue: 'The book is called "JavaScript"',
			} as TextColumn,
			'name',
		);
		expect(result).toEqual(
			`"name" TEXT NOT NULL DEFAULT 'The book is called "JavaScript"'`,
		);
	});

	it('handles both single and double quotes in default value', () => {
		const result = generateTextColumn(
			{
				type: 'text',
				defaultValue: `O'Reilly's book is called "JavaScript"`,
			} as TextColumn,
			'name',
		);
		expect(result).toEqual(
			`"name" TEXT NOT NULL DEFAULT 'O''Reilly''s book is called "JavaScript"'`,
		);
	});

	it('handles quotes in enum values', () => {
		const result = generateTextColumn(
			{
				type: 'text',
				enum: ["O'Reilly", 'The "Best" Book'],
			} as TextColumn,
			'name',
		);
		expect(result).toEqual(
			`"name" TEXT CHECK ("name" IN ('O''Reilly', 'The "Best" Book')) NOT NULL`,
		);
	});
});
