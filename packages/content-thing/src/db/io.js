/**
 * Create or replace a SQLite table based on a schema.
 * @param {import('better-sqlite3').Database} db - The better-sqlite3 database instance.
 * @param {import('../config/types.js').CollectionConfig} config - The schema for the table.
 * @param {string} tableName - The name of the table to be created or replaced.
 */
export function createTableFromSchema(db, config, tableName) {
	db.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();

	let columns = [];
	for (const [key, value] of Object.entries(config.schema.data)) {
		let columnDef = `"${key}" ${value.type.toUpperCase()}`;

		// Add the enum constraint only if type is text
		if (value.type === 'text' && value.enum) {
			columnDef += ` CHECK ("${key}" IN ('${value.enum.join("', '")}'))`;
		}

		columns.push(columnDef);
	}

	const createTableSQL = `CREATE TABLE ${tableName} (${columns.join(', ')})`;
	db.prepare(createTableSQL).run();
}
