import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	generateTextColumnCode,
	generateIntegerColumnCode,
	generateMarkdownSchema,
	generateYamlSchema,
} from '../src/db/schema.js';

describe('generateTextColumnCode', () => {
	it('generates code for text column with no options', () => {
		const result = generateTextColumnCode('name', { type: 'text' });
		assert.strictEqual(result, "text('name').notNull()");
	});

	it('generates code for text column with length', () => {
		const result = generateTextColumnCode('name', { type: 'text', length: 50 });
		assert.strictEqual(result, 'text(\'name\', {"length":50}).notNull()');
	});

	it('generates code for text column with enum', () => {
		const result = generateTextColumnCode('name', {
			type: 'text',
			enum: ['a', 'b'],
		});
		assert.strictEqual(result, 'text(\'name\', {"enum":["a","b"]}).notNull()');
	});

	it('generates code for text column with default value', () => {
		const result = generateTextColumnCode('name', {
			type: 'text',
			defaultValue: 'abc',
		});
		assert.strictEqual(result, 'text(\'name\').notNull().default("abc")');
	});

	it('generates code for text column as primary key', () => {
		const result = generateTextColumnCode('name', {
			type: 'text',
			primaryKey: true,
		});
		assert.strictEqual(result, "text('name').notNull().primaryKey()");
	});

	it('generates code for nullable text column', () => {
		const result = generateTextColumnCode('name', {
			type: 'text',
			nullable: true,
		});
		assert.strictEqual(result, "text('name')");
	});

	it('generates code for unique text column', () => {
		const result = generateTextColumnCode('name', {
			type: 'text',
			unique: 'unique_name',
		});
		assert.strictEqual(result, `text('name').notNull().unique("unique_name")`);
	});

	it('should generate text column code with all options', () => {
		const key = 'name';
		/** @type {import('../src/db/types.js').CTText} */
		const column = {
			type: 'text',
			length: 50,
			enum: ['value1', 'value2'],
			defaultValue: 'value1',
			primaryKey: true,
			nullable: true,
			unique: true,
		};
		const expected = `text('name', {"length":50,"enum":["value1","value2"]}).unique().default("value1").primaryKey()`;
		assert.strictEqual(generateTextColumnCode(key, column), expected);
	});

	it('should generate text column code with minimal options', () => {
		const key = 'name';
		/** @type {import('../src/db/types.js').CTText} */
		const column = {
			type: 'text',
		};
		const expected = `text('name').notNull()`;
		assert.strictEqual(generateTextColumnCode(key, column), expected);
	});
});

describe('generateIntegerColumnCode', () => {
	it('generates code for integer column with no options', () => {
		const result = generateIntegerColumnCode('age', { type: 'integer' });
		assert.strictEqual(result, "integer('age').notNull()");
	});

	it('generates code for integer column with mode', () => {
		const result = generateIntegerColumnCode('age', {
			type: 'integer',
			mode: 'timestamp',
		});
		assert.strictEqual(
			result,
			'integer(\'age\', {"mode":"timestamp"}).notNull()',
		);
	});

	it('generates code for integer column with default value', () => {
		const result = generateIntegerColumnCode('age', {
			type: 'integer',
			defaultValue: 25,
		});
		assert.strictEqual(result, "integer('age').notNull().default(25)");
	});

	it('generates code for integer column as primary key', () => {
		const result = generateIntegerColumnCode('age', {
			type: 'integer',
			primaryKey: true,
		});
		assert.strictEqual(result, "integer('age').notNull().primaryKey()");
	});

	it('generates code for nullable integer column', () => {
		const result = generateIntegerColumnCode('age', {
			type: 'integer',
			nullable: true,
		});
		assert.strictEqual(result, "integer('age')");
	});

	it('generates code for unique integer column', () => {
		const result = generateIntegerColumnCode('age', {
			type: 'integer',
			unique: 'unique_age',
		});
		assert.strictEqual(result, `integer('age').notNull().unique("unique_age")`);
	});

	it('should generate integer column code with all options', () => {
		const key = 'age';
		/** @type {import('../src/db/types.js').CTInteger} */
		const column = {
			type: 'integer',
			mode: 'timestamp',
			defaultValue: 0,
			primaryKey: true,
			nullable: true,
			unique: true,
		};
		const expected = `integer('age', {"mode":"timestamp"}).unique().default(0).primaryKey()`;
		assert.strictEqual(generateIntegerColumnCode(key, column), expected);
	});

	it('should generate integer column code with minimal options', () => {
		const key = 'age';
		/** @type {import('../src/db/types.js').CTInteger} */
		const column = {
			type: 'integer',
		};
		const expected = `integer('age').notNull()`;
		assert.strictEqual(generateIntegerColumnCode(key, column), expected);
	});
});

describe('generateMarkdownSchema', () => {
	it('should generate markdown schema', () => {
		/** @type {import('../src/db/types.js').CTMarkdownSchema} */
		const config = {
			data: {
				title: {
					type: 'text',
				},
				age: {
					type: 'integer',
				},
			},
		};
		const tableName = 'testTable';
		const expected =
			"import { json } from 'content-thing/db';\n" +
			`import { integer, sqliteTable, text } from 'content-thing/drizzle-orm/sqlite-core';\n\n` +
			`export const testTable = sqliteTable('testTable', {\n` +
			`\tid: text('id').primaryKey(),\n` +
			`\tdata_title: text('data_title').notNull(),\n` +
			`\tdata_age: integer('data_age').notNull(),\n` +
			"\theadingTree: /** @type {ReturnType<typeof json<import('content-thing').TocEntry[], 'headingTree'>>} */(json('headingTree')).notNull(),\n" +
			"\tcontent: /** @type {ReturnType<typeof json<import('content-thing/mdast').Root, 'content'>>} */(json('content')).notNull(),\n" +
			`});\n`;
		assert.strictEqual(generateMarkdownSchema(config, tableName), expected);
	});
	it('throws error for unsupported column types', () => {
		/** @type {import('../src/db/types.js').CTMarkdownSchema} */
		const config = {
			data: {
				title: {
					// @ts-expect-error
					type: 'unsupported',
				},
			},
		};
		assert.throws(
			() => generateMarkdownSchema(config, 'MyTable'),
			/Unsupported column type in schema/,
		);
	});
});

describe('generateYamlSchema', () => {
	it('should generate yaml schema', () => {
		/** @type {import('../src/db/types.js').CTYamlSchema} */
		const config = {
			data: {
				title: {
					type: 'text',
				},
				age: {
					type: 'integer',
				},
			},
		};
		const tableName = 'testTable';
		const expected =
			`import { sqliteTable, integer, text } from 'content-thing/drizzle-orm/sqlite-core';\n\n` +
			`export const testTable = sqliteTable('testTable', {\n` +
			`\tid: text('id').primaryKey(),\n` +
			`\tdata_title: text('data_title').notNull(),\n` +
			`\tdata_age: integer('data_age').notNull(),\n` +
			`});\n`;
		assert.strictEqual(generateYamlSchema(config, tableName), expected);
	});
	it('throws error for unsupported YAML column type', () => {
		/** @type {import('../src/db/types.js').CTYamlSchema} */
		const config = {
			data: {
				title: {
					// @ts-expect-error
					type: 'unsupported',
				},
			},
		};
		assert.throws(
			() => generateYamlSchema(config, 'MyTable'),
			/Unsupported column type in schema/,
		);
	});
});
