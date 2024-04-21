import type {
	CollectionConfig,
	ColumnType,
	IntegerColumn,
	JsonColumn,
	TextColumn,
} from '../config/types.js';
import { type Database } from '@signalapp/better-sqlite3';

/**
 * Create a SQLite table based on a schema.
 *
 * @param db - The better-sqlite3 database instance.
 * @param config - The schema for the table.
 */
export function createTableFromSchema(db: Database, config: CollectionConfig) {
	db.transaction(() => {
		db.prepare(`DROP TABLE IF EXISTS ${config.name}`).run();

		let columns = [];
		for (const [key, value] of Object.entries(config.data.fields || {})) {
			let columnDef;
			switch (value.type) {
				case 'integer':
					columnDef = generateIntegerColumn(value, key);
					break;
				case 'json':
					columnDef = generateJsonColumn(value, key);
					break;
				case 'text':
					columnDef = generateTextColumn(value, key);
					break;
				default:
					throw new Error(`Unsupported column type: ${(value as any)?.type}`);
			}

			columns.push(columnDef);
		}

		const createTableSQL = `CREATE TABLE ${config.name} (${columns.join(
			', ',
		)})`;
		db.prepare(createTableSQL).run();
	})();
}

/**
 * Inserts data into a SQLite table based on a schema.
 *
 * @param db - The better-sqlite3 database instance.
 * @param config - The schema for the table.
 * @param data - The data to insert, as a JSON object that matches the schema.data columns.
 */
export function insertIntoTable(
	db: Database,
	config: CollectionConfig,
	data: Record<string, any>,
) {
	const columnNames = [];
	const placeholders = [];
	const values = [];

	for (const [key, fieldConfig] of Object.entries(config.data.fields ?? {})) {
		if (
			fieldConfig.nullable !== true &&
			(!data.hasOwnProperty(key) ||
				data[key] === undefined ||
				data[key] === null)
		) {
			throw new Error(
				`Non-nullable key "${key}" in table "${config.name}" is "${
					data[key]
				}". \nRecord:\n${JSON.stringify(data, null, 4)}`,
			);
		}
	}

	for (const [key, value] of Object.entries(data)) {
		const fieldConfig = config.data.fields[key];
		if (fieldConfig) {
			validateValue(value, fieldConfig);
			columnNames.push(`"${key}"`);
			placeholders.push('?');
			values.push(fieldConfig.type === 'json' ? JSON.stringify(value) : value);
		}
	}

	const sql = `INSERT INTO ${config.name} (${columnNames.join(
		', ',
	)}) VALUES (${placeholders.join(', ')})`;

	try {
		db.prepare(sql).run(...values);
	} catch (cause) {
		const error = new Error(
			`Failed to insert values: ${JSON.stringify(
				values,
				null,
				4,
			)} with schema: ${JSON.stringify(config.data.fields, null, 4)}`,
		);
		error.cause = cause;
		throw error;
	}
}

/**
 * Deletes rows from a SQLite table based on provided criteria.
 *
 * @param db - The better-sqlite3 database instance.
 * @param config - The collection config for the table.
 * @param data - Criteria to match rows for deletion, as a JSON object that matches the schema.data columns.
 */
export function deleteFromTable(
	db: Database,
	config: CollectionConfig,
	data: Record<string, any>,
) {
	const conditions = [];
	const values = [];

	for (const [key, value] of Object.entries(data)) {
		const fieldConfig = config.data.fields[key];
		if (fieldConfig) {
			if (fieldConfig.type === 'json') {
				conditions.push(`"${key}" = ?`);
				values.push(JSON.stringify(value));
			} else {
				conditions.push(`"${key}" = ?`);
				values.push(value);
			}
		} else {
			throw new Error(
				`Key "${key}" is not defined in the schema for table ${config.name}.`,
			);
		}
	}

	if (conditions.length === 0) {
		throw new Error('No valid conditions provided for deletion.');
	}

	const sql = `DELETE FROM ${config.name} WHERE ${conditions.join(' AND ')}`;
	db.prepare(sql).run(...values);
}

/**
 * Removes a table from the database.
 *
 * @param db - The better-sqlite3 database instance.
 * @param config - The collection config for the table.
 */
export function dropTable(db: Database, config: CollectionConfig) {
	db.prepare(`DROP TABLE IF EXISTS ${config.name};`).run();
}

/**
 * Validates a value based on its field configuration.
 *
 * @param value - The value to validate.
 * @param fieldConfig - The field configuration object.
 */
function validateValue(value: any, fieldConfig: ColumnType) {
	switch (fieldConfig.type) {
		case 'integer':
			if (typeof value !== 'number' || !Number.isInteger(value)) {
				throw new Error(`Invalid value for integer type: ${value}`);
			}
			return;
		case 'text':
			if (typeof value !== 'string') {
				throw new Error(`Invalid value for text type: ${value}`);
			}
			return;
		case 'json':
			try {
				JSON.stringify(value); // will throw an error if value cannot be stringified
			} catch (e) {
				throw new Error(`Invalid value for json type: ${value}`);
			}
			return;
		default:
			// @ts-expect-error
			throw new Error(`Unsupported type: ${fieldConfig.type}`);
	}
}

export function generateIntegerColumn(
	config: IntegerColumn,
	columnName: string,
) {
	let columnDef = `"${columnName}" INTEGER`;

	if (config.nullable !== true) {
		columnDef += ' NOT NULL';
	}

	if (config.unique) {
		if (typeof config.unique === 'string') {
			columnDef += ` CONSTRAINT ${config.unique} UNIQUE`;
		} else {
			columnDef += ' UNIQUE';
		}
	}

	if (config.primaryKey) {
		columnDef += ' PRIMARY KEY';
		if (typeof config.primaryKey === 'object') {
			if (config.primaryKey.autoIncrement) {
				columnDef += ' AUTOINCREMENT';
			}
			if (config.primaryKey.onConflict) {
				columnDef += ` ON CONFLICT ${config.primaryKey.onConflict.toUpperCase()}`;
			}
		}
	}

	if (config.defaultValue !== undefined) {
		columnDef += ` DEFAULT ${config.defaultValue}`;
	}

	return columnDef;
}

const safelyQuoteString = (str: string) => str.replace(/'/g, "''");

export function generateJsonColumn(config: JsonColumn, columnName: string) {
	let columnDef = `"${columnName}" TEXT`;

	if (config.nullable !== true) {
		columnDef += ' NOT NULL';
	}

	if (config.unique) {
		if (typeof config.unique === 'string') {
			columnDef += ` CONSTRAINT ${config.unique} UNIQUE`;
		} else {
			columnDef += ' UNIQUE';
		}
	}

	if (config.primaryKey) {
		columnDef += ' PRIMARY KEY';
	}

	if (config.defaultValue) {
		columnDef += ` DEFAULT '${safelyQuoteString(config.defaultValue)}'`;
	}

	return columnDef;
}

export function generateTextColumn(config: TextColumn, columnName: string) {
	let columnDef = `"${columnName}" TEXT`;

	if (config.length) {
		columnDef += `(${config.length})`;
	}

	if (config.enum) {
		const safelyQuotedEnum = config.enum.map(safelyQuoteString).join("', '");
		columnDef += ` CHECK ("${columnName}" IN ('${safelyQuotedEnum}'))`;
	}

	if (config.nullable !== true) {
		columnDef += ' NOT NULL';
	}

	if (config.unique) {
		if (typeof config.unique === 'string') {
			columnDef += ` CONSTRAINT ${config.unique} UNIQUE`;
		} else {
			columnDef += ' UNIQUE';
		}
	}

	if (config.primaryKey) {
		columnDef += ' PRIMARY KEY';
	}

	if (config.defaultValue) {
		const escapedDefaultValue = config.defaultValue.replace(/'/g, "''");
		columnDef += ` DEFAULT '${escapedDefaultValue}'`;
	}

	return columnDef;
}
