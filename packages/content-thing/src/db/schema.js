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
 * Generates the column code for JSON type
 *
 * @param {string} key - The key or name of the column
 * @param {import("../config/types.js").JsonColumn} column - The column configuration for JSON type
 * @returns {string} - Generated code for JSON column
 */
export function generateJsonColumnCode(key, column) {
	let columnCode = `json('${key}')`;

	if (column.jsDocType) {
		columnCode = `/** @type {ReturnType<typeof json<${column.jsDocType}, '${key}'>>} */(${columnCode})`;
	}

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

const DRIZZLE_COLUMNS = ['integer', 'text'];
const CONTENT_THING_COLUMNS = ['json'];
/**
 * Generates SQLite schema for Markdown type
 *
 * @param {import("../config/types.js").CollectionSchema} schema - The configuration for Markdown type
 * @param {string} tableName - The name of the table
 * @returns {string} - The generated SQLite schema
 */
export function generateSchema(schema, tableName) {
	const drizzleImports = new Set(['sqliteTable']);
	const contentThingImports = new Set();

	if (schema.data) {
		const columns = Object.values(schema.data);
		for (const column of columns) {
			if (DRIZZLE_COLUMNS.includes(column.type)) {
				drizzleImports.add(column.type);
			} else if (CONTENT_THING_COLUMNS.includes(column.type)) {
				contentThingImports.add(column.type);
			}
		}
	}

	let schemaCode = `import { ${[...drizzleImports]
		.sort()
		.join(', ')} } from 'content-thing/drizzle-orm/sqlite-core';\n`;

	if (contentThingImports.size) {
		schemaCode += `import { ${[...contentThingImports]
			.sort()
			.join(', ')} } from 'content-thing/db';\n`;
	}

	schemaCode += `\n`;
	schemaCode += `export const ${tableName} = sqliteTable('${tableName}', {\n`;

	if (schema.data) {
		for (const key in schema.data) {
			const column = schema.data[key];
			const columnType = column.type;
			let columnCode = '';
			if (columnType === 'text') {
				columnCode = generateTextColumnCode(key, column);
			} else if (columnType === 'integer') {
				columnCode = generateIntegerColumnCode(key, column);
			} else if (columnType === 'json') {
				columnCode = generateJsonColumnCode(key, column);
			} else {
				throw new Error(
					`Unsupported column type in schema: ${columnType}. File an issue to implement missing types.`,
				);
			}
			schemaCode += `\t${key}: ${columnCode},\n`;
		}
	}
	schemaCode += '});\n';
	return schemaCode;
}
