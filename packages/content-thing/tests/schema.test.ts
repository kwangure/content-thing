import { describe, expect, it } from 'vitest';
import {
	generateTextColumnCode,
	generateIntegerColumnCode,
	generateJsonColumnCode,
	generateSchema,
} from '../src/db/schema.js';
import type {
	IntegerColumn,
	JsonColumn,
	TextColumn,
} from '../src/config/types.js';

describe('generateTextColumnCode', () => {
	it('generates code for text column with no options', () => {
		const result = generateTextColumnCode('name', {
			type: 'text',
		} as TextColumn);
		expect(result).toEqual("text('name').notNull()");
	});

	it('generates code for text column with length', () => {
		const result = generateTextColumnCode('name', {
			type: 'text',
			length: 50,
		} as TextColumn);
		expect(result).toEqual('text(\'name\', {"length":50}).notNull()');
	});

	it('generates code for text column with enum', () => {
		const result = generateTextColumnCode('name', {
			type: 'text',
			enum: ['a', 'b'],
		} as TextColumn);
		expect(result).toEqual('text(\'name\', {"enum":["a","b"]}).notNull()');
	});

	it('generates code for text column with default value', () => {
		const result = generateTextColumnCode('name', {
			type: 'text',
			defaultValue: 'abc',
		} as TextColumn);
		expect(result).toEqual('text(\'name\').notNull().default("abc")');
	});

	it('generates code for text column as primary key', () => {
		const result = generateTextColumnCode('name', {
			type: 'text',
			primaryKey: true,
		} as TextColumn);
		expect(result).toEqual("text('name').notNull().primaryKey()");
	});

	it('generates code for nullable text column', () => {
		const result = generateTextColumnCode('name', {
			type: 'text',
			nullable: true,
		});
		expect(result).toEqual("text('name')");
	});

	it('generates code for unique text column', () => {
		const result = generateTextColumnCode('name', {
			type: 'text',
			unique: 'unique_name',
		} as TextColumn);
		expect(result).toEqual(`text('name').notNull().unique("unique_name")`);
	});

	it('should generate text column code with all options', () => {
		const key = 'name';
		const column = {
			type: 'text',
			length: 50,
			enum: ['value1', 'value2'],
			defaultValue: 'value1',
			primaryKey: true,
			nullable: true,
			unique: true,
		} as TextColumn;
		const expected = `text('name', {"length":50,"enum":["value1","value2"]}).unique().default("value1").primaryKey()`;
		expect(generateTextColumnCode(key, column)).toEqual(expected);
	});

	it('should generate text column code with minimal options', () => {
		const key = 'name';
		const column = {
			type: 'text',
		} as TextColumn;
		const expected = `text('name').notNull()`;
		expect(generateTextColumnCode(key, column)).toEqual(expected);
	});
});

describe('generateIntegerColumnCode', () => {
	it('generates code for integer column with no options', () => {
		const result = generateIntegerColumnCode('age', {
			type: 'integer',
		} as IntegerColumn);
		expect(result).toEqual("integer('age').notNull()");
	});

	it('generates code for integer column with mode', () => {
		const result = generateIntegerColumnCode('age', {
			type: 'integer',
			mode: 'timestamp',
		} as IntegerColumn);
		expect(result).toEqual('integer(\'age\', {"mode":"timestamp"}).notNull()');
	});

	it('generates code for integer column with default value', () => {
		const result = generateIntegerColumnCode('age', {
			type: 'integer',
			defaultValue: 25,
		} as IntegerColumn);
		expect(result).toEqual("integer('age').notNull().default(25)");
	});

	it('generates code for integer column as primary key', () => {
		const result = generateIntegerColumnCode('age', {
			type: 'integer',
			primaryKey: true,
		} as IntegerColumn);
		expect(result).toEqual("integer('age').notNull().primaryKey()");
	});

	it('generates code for nullable integer column', () => {
		const result = generateIntegerColumnCode('age', {
			type: 'integer',
			nullable: true,
		});
		expect(result).toEqual("integer('age')");
	});

	it('generates code for unique integer column', () => {
		const result = generateIntegerColumnCode('age', {
			type: 'integer',
			unique: 'unique_age',
		} as IntegerColumn);
		expect(result).toEqual(`integer('age').notNull().unique("unique_age")`);
	});

	it('should generate integer column code with all options', () => {
		const key = 'age';
		const column = {
			type: 'integer',
			mode: 'timestamp',
			defaultValue: 0,
			primaryKey: true,
			nullable: true,
			unique: true,
		} as IntegerColumn;
		const expected = `integer('age', {"mode":"timestamp"}).unique().default(0).primaryKey()`;
		expect(generateIntegerColumnCode(key, column)).toEqual(expected);
	});

	it('should generate integer column code with minimal options', () => {
		const key = 'age';
		const column = {
			type: 'integer',
		} as IntegerColumn;
		const expected = `integer('age').notNull()`;
		expect(generateIntegerColumnCode(key, column)).toEqual(expected);
	});
});

describe('generateJsonColumnCode', () => {
	it('generates code for JSON column with no options', () => {
		const result = generateJsonColumnCode('data', {
			type: 'json',
		} as JsonColumn);
		expect(result).toEqual("json('data').notNull()");
	});

	it('generates code for JSON column with JSDoc type', () => {
		const result = generateJsonColumnCode('data', {
			type: 'json',
			jsDocType: 'SomeType',
		} as JsonColumn);
		expect(result).toEqual(
			"/** @type {ReturnType<typeof json<SomeType, 'data'>>} */(json('data')).notNull()",
		);
	});

	it('generates code for JSON column with default value', () => {
		const result = generateJsonColumnCode('data', {
			type: 'json',
			defaultValue: '{"key": "value"}',
		} as JsonColumn);
		expect(result).toEqual(
			`json('data').notNull().default("{\\"key\\": \\"value\\"}")`,
		);
	});

	it('generates code for JSON column as primary key', () => {
		const result = generateJsonColumnCode('data', {
			type: 'json',
			primaryKey: true,
		} as JsonColumn);
		expect(result).toEqual("json('data').notNull().primaryKey()");
	});

	it('generates code for nullable JSON column', () => {
		const result = generateJsonColumnCode('data', {
			type: 'json',
			nullable: true,
		} as JsonColumn);
		expect(result).toEqual("json('data')");
	});

	it('generates code for unique JSON column', () => {
		const result = generateJsonColumnCode('data', {
			type: 'json',
			unique: 'unique_data',
		} as JsonColumn);
		expect(result).toEqual(`json('data').notNull().unique("unique_data")`);
	});

	it('should generate JSON column code with all options', () => {
		const key = 'data';
		const column = {
			type: 'json',
			jsDocType: 'SomeType',
			defaultValue: '{"key": "value"}',
			primaryKey: true,
			nullable: true,
			unique: true,
		} as JsonColumn;
		const expected = `/** @type {ReturnType<typeof json<SomeType, 'data'>>} */(json('data')).unique().default("{\\"key\\": \\"value\\"}").primaryKey()`;
		expect(generateJsonColumnCode(key, column)).toEqual(expected);
	});

	it('should generate JSON column code with minimal options', () => {
		const key = 'data';
		const column = {
			type: 'json',
		} as JsonColumn;
		const expected = `json('data').notNull()`;
		expect(generateJsonColumnCode(key, column)).toEqual(expected);
	});
});

describe('generateSchema', () => {
	it('should generate markdown schema', () => {
		const config = {
			name: 'testTable',
			schema: {
				data: {
					name: {
						type: 'text',
					},
					age: {
						type: 'integer',
					},
					preferences: {
						type: 'json',
					},
				},
			},
		};
		const expected =
			`import { integer, sqliteTable, text } from 'content-thing/drizzle-orm/sqlite-core';\n` +
			"import { json } from 'content-thing/db';\n" +
			'\n' +
			`export const testTable = sqliteTable('testTable', {\n` +
			`\tname: text('name').notNull(),\n` +
			`\tage: integer('age').notNull(),\n` +
			`\tpreferences: json('preferences').notNull(),\n` +
			`});\n`;
		expect(generateSchema(config as any)).toEqual(expected);
	});
	it('throws error for unsupported column types', () => {
		const config = {
			name: 'testTable',
			schema: {
				data: {
					title: {
						type: 'unsupported',
					},
				},
			},
		};
		expect(() => generateSchema(config as any)).toThrow(
			/Unsupported column type in schema/,
		);
	});
});
