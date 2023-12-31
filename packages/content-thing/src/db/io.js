/**
 * Create a SQLite table based on a schema.
 *
 * @param {import('better-sqlite3').Database} db - The better-sqlite3 database instance.
 * @param {import('../config/types.js').CollectionConfig} config - The schema for the table.
 */
export function createTableFromSchema(db, config) {
	db.transaction(() => {
		db.prepare(`DROP TABLE IF EXISTS ${config.name}`).run();

		let columns = [];
		for (const [key, value] of Object.entries(config.schema.data || {})) {
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
					throw new Error(
						`Unsupported column type: ${/** @type {any} */ (value)?.type}`,
					);
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
 * @param {import('better-sqlite3').Database} db - The better-sqlite3 database instance.
 * @param {import('../config/types.js').CollectionConfig} config - The schema for the table.
 * @param {Record<string, any>} data - The data to insert, as a JSON object that matches the schema.data columns.
 */
export function insertIntoTable(db, config, data) {
	const columnNames = [];
	const placeholders = [];
	const values = [];

	for (const [key, fieldConfig] of Object.entries(config.schema.data)) {
		if (fieldConfig.nullable !== true && !data.hasOwnProperty(key)) {
			throw new Error(
				`Non-nullable key "${key}" is missing in the data for table ${config.name}.`,
			);
		}
	}

	for (const [key, value] of Object.entries(data)) {
		const fieldConfig = config.schema.data[key];
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
			)} with schema: ${JSON.stringify(config.schema.data, null, 4)}`,
		);
		error.cause = cause;
		throw error;
	}
}

/**
 * Deletes rows from a SQLite table based on provided criteria.
 *
 * @param {import('better-sqlite3').Database} db - The better-sqlite3 database instance.
 * @param {import('../config/types.js').CollectionConfig} config - The schema for the table.
 * @param {Record<string, any>} data - Criteria to match rows for deletion, as a JSON object that matches the schema.data columns.
 */
export function deleteFromTable(db, config, data) {
	const conditions = [];
	const values = [];

	for (const [key, value] of Object.entries(data)) {
		const fieldConfig = config.schema.data[key];
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
 * Validates a value based on its field configuration.
 *
 * @param {any} value - The value to validate.
 * @param {import('../config/types.js').ColumnType} fieldConfig - The field configuration object.
 */
function validateValue(value, fieldConfig) {
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

/**
 * @param {import('../config/types.js').IntegerColumn} config
 * @param {string} columnName
 */
export function generateIntegerColumn(config, columnName) {
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

/**
 * @param {string} str
 */
const safelyQuoteString = (str) => str.replace(/'/g, "''");

/**
 * @param {import('../config/types.js').JsonColumn} config
 * @param {string} columnName
 */
export function generateJsonColumn(config, columnName) {
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

/**
 * @param {import('../config/types.js').TextColumn} config
 * @param {string} columnName
 */
export function generateTextColumn(config, columnName) {
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
