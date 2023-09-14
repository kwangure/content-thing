import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { exec } from 'child_process';

/**
 * Executes the "drizzle-kit generate:sqlite" CLI command.
 *
 * @param {string} schema The schema for the DB
 * @param {string} output The directory to output the folder
 */
export function generateSQLiteDB(schema, output) {
	return /** @type {Promise<void>} */ (
		new Promise((resolve, reject) => {
			exec(
				`drizzle-kit generate:sqlite --schema ${schema} --out ${output}`,
				(error, stdout, stderr) => {
					if (error) {
						console.log(stdout);
						console.error(stderr);
						console.error(error);
						reject();
						return;
					}
					resolve();
				},
			);
		})
	);
}

/**
 * Executes the "drizzle-kit push:sqlite" CLI command.
 *
 * @param {string} schema The schema for the DB
 * @param {string} url The location of the DB
 */
export function pushSQLiteDB(schema, url) {
	return /** @type {Promise<void>} */ (
		new Promise((resolve, reject) => {
			exec(
				`drizzle-kit push:sqlite --schema ${schema} --driver better-sqlite --url ${url}`,
				(error, stdout, stderr) => {
					if (error) {
						console.log(stdout);
						console.error(stderr);
						console.error(error);
						reject();
						return;
					}
					resolve();
				},
			);
		})
	);
}

/**
 * Loads the JSON output of collection files into the databse
 *
 * @param {string} dbPath
 * @param {import('../collections/entry/types.js').CollectionEntry[]} entries
 */
export async function loadSQLiteDB(dbPath, entries) {
	/** @type {Record<string, any>} */
	const schema = {};
	for (const entry of entries) {
		Object.assign(schema, entry.getSchemas());
	}
	const sqlite = new Database(dbPath);
	const db = drizzle(sqlite, { schema });
	for (const entry of entries) {
		entry.writeToStorage(db);
	}
}
