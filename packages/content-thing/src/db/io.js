import { cwd } from 'node:process';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import { writeFileErrors } from '../collections/write.js';

/**
 * Loads the JSON output of collection files into the databse
 *
 * @param {import('better-sqlite3').Database} sqlite - The better-sqlite3 database instance.
 * @param {import('../collections/entry/types.js').CollectionEntry[]} entries
 */
export async function loadSQLiteDB(sqlite, entries) {
	/** @type {Record<string, any>} */
	const schema = {};
	for (const entry of entries) {
		Object.assign(schema, await entry.getSchemas());
	}

	const outputDir = path.join(cwd(), './.svelte-kit/content-thing/generated');
	const db = drizzle(sqlite, { schema });

	for (const entry of entries) {
		const data = entry.getRecord();
		const validator = await entry.getValidators().then(({ insert }) => insert);
		const validatedJson = writeFileErrors(
			data,
			validator,
			path.join(outputDir, 'collections', entry.collection, entry.id),
		);
		await db
			.insert(schema[entry.collection])
			.values(validatedJson)
			.onConflictDoUpdate({
				target: schema[entry.collection]._id,
				set: validatedJson,
			});
	}
}

/**
 * Create a SQLite table based on a schema.
 *
 * @param {import('better-sqlite3').Database} db - The better-sqlite3 database instance.
 * @param {import('../config/types.js').CollectionConfig} config - The schema for the table.
 * @param {string} tableName - The name of the table to be created or replaced.
 */
export function createTableFromSchema(db, config, tableName) {
	db.transaction(() => {
		db.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();

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

		const createTableSQL = `CREATE TABLE ${tableName} (${columns.join(', ')})`;
		db.prepare(createTableSQL).run();
	})();
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
		if (typeof config.primaryKey === 'object') {
			if (config.primaryKey.autoIncrement) {
				columnDef += ' AUTOINCREMENT';
			}
			if (config.primaryKey.onConflict) {
				columnDef += ` ON CONFLICT ${config.primaryKey.onConflict.toUpperCase()}`;
			}
		}
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
		if (typeof config.primaryKey === 'object') {
			if (config.primaryKey.autoIncrement) {
				columnDef += ' AUTOINCREMENT';
			}
			if (config.primaryKey.onConflict) {
				columnDef += ` ON CONFLICT ${config.primaryKey.onConflict.toUpperCase()}`;
			}
		}
	}

	if (config.defaultValue) {
		const escapedDefaultValue = config.defaultValue.replace(/'/g, "''");
		columnDef += ` DEFAULT '${escapedDefaultValue}'`;
	}

	return columnDef;
}
