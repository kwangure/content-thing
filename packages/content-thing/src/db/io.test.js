import { describe, it } from 'node:test';
import {
	generateIntegerColumn,
	generateJsonColumn,
	generateTextColumn,
} from './io.js';
import assert from 'node:assert';

describe('generateIntegerColumn', () => {
	it('should generate code for an integer column with no options', () => {
		const result = generateIntegerColumn(
			/** @type {import('../config/types.js').IntegerColumn} */ ({
				type: 'integer',
			}),
			'id',
		);
		assert.strictEqual(result, '"id" INTEGER NOT NULL');
	});

	it('should generate code for a nullable integer column', () => {
		const result = generateIntegerColumn(
			/** @type {import('../config/types.js').IntegerColumn} */ ({
				type: 'integer',
				nullable: true,
			}),
			'id',
		);
		assert.strictEqual(result, '"id" INTEGER');
	});

	it('should generate code for a unique integer column with custom constraint name', () => {
		const result = generateIntegerColumn(
			/** @type {import('../config/types.js').IntegerColumn} */ ({
				type: 'integer',
				unique: 'unique_id',
			}),
			'id',
		);
		assert.strictEqual(
			result,
			'"id" INTEGER NOT NULL CONSTRAINT unique_id UNIQUE',
		);
	});

	it('should generate code for a unique integer column without custom constraint name', () => {
		const result = generateIntegerColumn(
			/** @type {import('../config/types.js').IntegerColumn} */ ({
				type: 'integer',
				unique: true,
			}),
			'id',
		);
		assert.strictEqual(result, '"id" INTEGER NOT NULL UNIQUE');
	});

	it('should generate code for an integer column as primary key', () => {
		const result = generateIntegerColumn(
			/** @type {import('../config/types.js').IntegerColumn} */ ({
				type: 'integer',
				primaryKey: true,
			}),
			'id',
		);
		assert.strictEqual(result, '"id" INTEGER NOT NULL PRIMARY KEY');
	});

	it('should generate code for an integer column with default value', () => {
		const result = generateIntegerColumn(
			/** @type {import('../config/types.js').IntegerColumn} */ ({
				type: 'integer',
				defaultValue: 1,
			}),
			'id',
		);
		assert.strictEqual(result, '"id" INTEGER NOT NULL DEFAULT 1');
	});

	it('should generate code for an integer column with all options', () => {
		const result = generateIntegerColumn(
			/** @type {import('../config/types.js').IntegerColumn} */ ({
				type: 'integer',
				primaryKey: true,
				unique: 'unique_id',
				defaultValue: 1,
				nullable: false,
			}),
			'id',
		);
		assert.strictEqual(
			result,
			'"id" INTEGER NOT NULL CONSTRAINT unique_id UNIQUE PRIMARY KEY DEFAULT 1',
		);
	});
});

describe('generateJsonColumn', () => {
	it('should generate code for a JSON column with no options', () => {
		const result = generateJsonColumn(
			/** @type {import('../config/types.js').JsonColumn} */ ({ type: 'json' }),
			'json_data',
		);
		assert.strictEqual(result, '"json_data" TEXT NOT NULL');
	});

	it('should generate code for a nullable JSON column', () => {
		const result = generateJsonColumn(
			/** @type {import('../config/types.js').JsonColumn} */ ({
				type: 'json',
				nullable: true,
			}),
			'json_data',
		);
		assert.strictEqual(result, '"json_data" TEXT');
	});

	it('should generate code for a unique JSON column', () => {
		const result = generateJsonColumn(
			/** @type {import('../config/types.js').JsonColumn} */ ({
				type: 'json',
				unique: true,
			}),
			'json_data',
		);
		assert.strictEqual(result, '"json_data" TEXT NOT NULL UNIQUE');
	});

	it('should generate code for a unique JSON column with constraint name', () => {
		const result = generateJsonColumn(
			/** @type {import('../config/types.js').JsonColumn} */ ({
				type: 'json',
				unique: 'unique_json',
			}),
			'json_data',
		);
		assert.strictEqual(
			result,
			'"json_data" TEXT NOT NULL CONSTRAINT unique_json UNIQUE',
		);
	});

	it('should generate code for a JSON column as primary key', () => {
		const result = generateJsonColumn(
			/** @type {import('../config/types.js').JsonColumn} */ ({
				type: 'json',
				primaryKey: true,
			}),
			'json_data',
		);
		assert.strictEqual(result, '"json_data" TEXT NOT NULL PRIMARY KEY');
	});

	it('should generate code for a JSON column with a default value', () => {
		const result = generateJsonColumn(
			/** @type {import('../config/types.js').JsonColumn} */ ({
				type: 'json',
				defaultValue: JSON.stringify({ key: 'value' }),
			}),
			'json_data',
		);
		assert.strictEqual(
			result,
			'"json_data" TEXT NOT NULL DEFAULT \'{"key":"value"}\'',
		);
	});

	it('should generate code for a JSON column with all options', () => {
		const result = generateJsonColumn(
			/** @type {import('../config/types.js').JsonColumn} */ ({
				type: 'json',
				primaryKey: true,
				nullable: false,
				unique: 'unique_json',
				defaultValue: JSON.stringify({ key: 'value' }),
			}),
			'json_data',
		);
		assert.strictEqual(
			result,
			'"json_data" TEXT NOT NULL CONSTRAINT unique_json UNIQUE PRIMARY KEY DEFAULT \'{"key":"value"}\'',
		);
	});
});

describe('generateTextColumn', () => {
	it('should generate code for a text column with no additional options', () => {
		const result = generateTextColumn(
			/** @type {import('../config/types.js').TextColumn} */ ({ type: 'text' }),
			'name',
		);
		assert.strictEqual(result, '"name" TEXT NOT NULL');
	});

	it('should generate code for a text column with length', () => {
		const result = generateTextColumn(
			/** @type {import('../config/types.js').TextColumn} */ ({
				type: 'text',
				length: 50,
			}),
			'name',
		);
		assert.strictEqual(result, '"name" TEXT(50) NOT NULL');
	});

	it('should generate code for a text column with enum', () => {
		const result = generateTextColumn(
			/** @type {import('../config/types.js').TextColumn} */ ({
				type: 'text',
				enum: ['A', 'B'],
			}),
			'name',
		);
		assert.strictEqual(
			result,
			'"name" TEXT CHECK ("name" IN (\'A\', \'B\')) NOT NULL',
		);
	});

	it('should generate code for a text column with a default value', () => {
		const result = generateTextColumn(
			/** @type {import('../config/types.js').TextColumn} */ ({
				type: 'text',
				defaultValue: 'abc',
			}),
			'name',
		);
		assert.strictEqual(result, '"name" TEXT NOT NULL DEFAULT \'abc\'');
	});

	it('should generate code for a text column as a primary key', () => {
		const result = generateTextColumn(
			/** @type {import('../config/types.js').TextColumn} */ ({
				type: 'text',
				primaryKey: true,
			}),
			'name',
		);
		assert.strictEqual(result, '"name" TEXT NOT NULL PRIMARY KEY');
	});

	it('should generate code for a nullable text column', () => {
		const result = generateTextColumn(
			/** @type {import('../config/types.js').TextColumn} */ ({
				type: 'text',
				nullable: true,
			}),
			'name',
		);
		assert.strictEqual(result, '"name" TEXT');
	});

	it('should generate code for a unique text column', () => {
		const result = generateTextColumn(
			/** @type {import('../config/types.js').TextColumn} */ ({
				type: 'text',
				unique: 'unique_name',
			}),
			'name',
		);
		assert.strictEqual(
			result,
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
		assert.strictEqual(
			result,
			"\"name\" TEXT(50) CHECK (\"name\" IN ('A', 'B')) NOT NULL UNIQUE PRIMARY KEY DEFAULT 'A'",
		);
	});

	it('handles single quotes in default value', () => {
		const result = generateTextColumn(
			/** @type {import('../config/types.js').TextColumn} */ ({
				type: 'text',
				defaultValue: "O'Reilly",
			}),
			'name',
		);
		assert.strictEqual(result, `"name" TEXT NOT NULL DEFAULT 'O''Reilly'`);
	});

	it('handles double quotes in default value', () => {
		const result = generateTextColumn(
			/** @type {import('../config/types.js').TextColumn} */ ({
				type: 'text',
				defaultValue: 'The book is called "JavaScript"',
			}),
			'name',
		);
		assert.strictEqual(
			result,
			`"name" TEXT NOT NULL DEFAULT 'The book is called "JavaScript"'`,
		);
	});

	it('handles both single and double quotes in default value', () => {
		const result = generateTextColumn(
			/** @type {import('../config/types.js').TextColumn} */ ({
				type: 'text',
				defaultValue: `O'Reilly's book is called "JavaScript"`,
			}),
			'name',
		);
		assert.strictEqual(
			result,
			`"name" TEXT NOT NULL DEFAULT 'O''Reilly''s book is called "JavaScript"'`,
		);
	});

	it('handles quotes in enum values', () => {
		const result = generateTextColumn(
			/** @type {import('../config/types.js').TextColumn} */ ({
				type: 'text',
				enum: ["O'Reilly", 'The "Best" Book'],
			}),
			'name',
		);
		assert.strictEqual(
			result,
			`"name" TEXT CHECK ("name" IN ('O''Reilly', 'The "Best" Book')) NOT NULL`,
		);
	});
});
