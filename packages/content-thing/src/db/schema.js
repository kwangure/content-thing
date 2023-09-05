/**
 * Generates the column code for text type
 *
 * @param {string} key - The key or name of the column
 * @param {import("./types").CTText} column - The column configuration for text type
 * @returns {string} - Generated code for text column
 */
export function generateTextColumnCode(key, column) {
	const options = {};
	if (column.length) {
		options.length = column.length;
	}

	if (column.enum) {
		options.enum = column.enum;
	}

	let columnCode = `text('${key}'`;

	if (Object.keys(options).length > 0) {
		columnCode += `, ${JSON.stringify(options)}`;
	}

	columnCode += ')';

	if (!column.nullable) {
		columnCode += `.notNull()`;
	}

	if (column.unique) {
		if (typeof column.unique === 'boolean') {
			columnCode += `.unique()`;
		} else {
			columnCode += `.unique(${JSON.stringify(column.unique)})`;
		}
	}

	if (column.defaultValue !== undefined) {
		columnCode += `.default(${JSON.stringify(column.defaultValue)})`;
	}

	if (column.primaryKey) {
		if (typeof column.primaryKey === 'boolean') {
			columnCode += '.primaryKey()';
		} else {
			columnCode += `.primaryKey(${JSON.stringify(column.primaryKey)})`;
		}
	}

	return columnCode;
}

/**
 * Generates the column code for integer type
 *
 * @param {string} key - The key or name of the column
 * @param {import("./types").CTInteger} column - The column configuration for integer type
 * @returns {string} - Generated code for integer column
 */
export function generateIntegerColumnCode(key, column) {
	const options = {};
	if (column.mode) {
		options.mode = column.mode;
	}

	let columnCode = `integer('${key}'`;

	if (Object.keys(options).length > 0) {
		columnCode += `, ${JSON.stringify(options)}`;
	}

	columnCode += ')';

	if (!column.nullable) {
		columnCode += `.notNull()`;
	}

	if (column.unique) {
		if (typeof column.unique === 'boolean') {
			columnCode += `.unique()`;
		} else {
			columnCode += `.unique(${JSON.stringify(column.unique)})`;
		}
	}

	if (column.defaultValue !== undefined) {
		columnCode += `.default(${JSON.stringify(column.defaultValue)})`;
	}

	if (column.primaryKey) {
		if (typeof column.primaryKey === 'boolean') {
			columnCode += '.primaryKey()';
		} else {
			columnCode += `.primaryKey(${JSON.stringify(column.primaryKey)})`;
		}
	}

	return columnCode;
}

/**
 * Generates SQLite schema for Markdown type
 *
 * @param {import("./types").CTMarkdownSchema} schema - The configuration for Markdown type
 * @param {string} tableName - The name of the table
 * @returns {string} - The generated SQLite schema
 */
export function generateMarkdownSchema(schema, tableName) {
	let schemaCode = `import { json } from 'content-thing/db';\n`;
	if (schema.data) {
		const types = new Set(
			[
				'sqliteTable',
				...Object.values(schema.data).map(({ type }) => type),
			].sort(),
		);
		schemaCode += `import { ${[...types].join(
			', ',
		)} } from 'content-thing/drizzle-orm/sqlite-core';\n`;
	}
	schemaCode += `\n`;
	schemaCode += `export const ${tableName} = sqliteTable('${tableName}', {\n`;
	schemaCode += `\tid: text('id').primaryKey(),\n`;

	if (schema.data) {
		for (const key in schema.data) {
			const column = schema.data[key];
			const columnType = column.type;
			let columnCode = '';
			if (columnType === 'text') {
				columnCode = generateTextColumnCode(`data_${key}`, column);
			} else if (columnType === 'integer') {
				columnCode = generateIntegerColumnCode(`data_${key}`, column);
			} else {
				throw new Error(
					`Unsupported column type in schema: ${columnType}. File an issue to implement missing types.`,
				);
			}
			schemaCode += `\tdata_${key}: ${columnCode},\n`;
		}
	}
	schemaCode += `\theadingTree: /** @type {ReturnType<typeof json<import('content-thing').TocEntry[], 'headingTree'>>} */(json('headingTree')).notNull(),\n`;
	schemaCode += `\tcontent: /** @type {ReturnType<typeof json<import('content-thing/mdast').Root, 'content'>>} */(json('content')).notNull(),\n`;
	schemaCode += '});\n';
	return schemaCode;
}

/**
 * Generates SQLite schema for YAML type
 *
 * @param {import("./types").CTYamlSchema} schema - The configuration for YAML type
 * @param {string} tableName - The name of the table
 * @returns {string} - The generated SQLite schema
 */
export function generateYamlSchema(schema, tableName) {
	let schemaCode = `import { sqliteTable, integer, text } from 'content-thing/drizzle-orm/sqlite-core';\n\n`;
	schemaCode += `export const ${tableName} = sqliteTable('${tableName}', {\n`;
	schemaCode += `\tid: text('id').primaryKey(),\n`;

	for (const key in schema.data) {
		const column = schema.data[key];
		const columnType = column.type;
		let columnCode = '';
		if (columnType === 'text') {
			columnCode = generateTextColumnCode(`data_${key}`, column);
		} else if (columnType === 'integer') {
			columnCode = generateIntegerColumnCode(`data_${key}`, column);
		} else {
			throw new Error(
				`Unsupported column type in schema: ${columnType}. File an issue to implement missing types.`,
			);
		}
		schemaCode += `\tdata_${key}: ${columnCode},\n`;
	}

	schemaCode += '});\n';
	return schemaCode;
}