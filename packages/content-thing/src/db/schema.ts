import type { CollectionConfig, JsonColumn } from '../config/types';
import type { CTInteger, CTText } from './types';

/**
 * Generates the column code for text type
 *
 * @param key - The key or name of the column
 * @param column - The column configuration for text type
 * @returns Generated code for text column
 */
export function generateTextColumnCode(key: string, column: CTText) {
	const options: Partial<CTText> = {};
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
 * @param key The key or name of the column
 * @param column The column configuration for integer type
 * @returns Generated code for integer column
 */
export function generateIntegerColumnCode(key: string, column: CTInteger) {
	const options: Partial<CTInteger> = {};
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
 * @param key The key or name of the column
 * @param column The column configuration for JSON type
 * @returns Generated code for JSON column
 */
export function generateJsonColumnCode(key: string, column: JsonColumn) {
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
 * @param schema The configuration for Markdown type
 * @param tableName The name of the table
 * @returns The generated SQLite schema
 */
export function generateSchema(collectionConfig: CollectionConfig) {
	const drizzleImports = new Set(['sqliteTable']);
	const contentThingImports = new Set();

	const { schema, name: tableName } = collectionConfig;
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
