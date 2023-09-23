import { cwd } from 'node:process';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { exec } from 'child_process';
import path from 'node:path';
import { writeFileErrors } from '../collections/write.js';

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
 * @param {import('../collections/entry/types.js').CollectionEntry[]} entries
 */
export async function loadSQLiteDB(entries) {
	/** @type {Record<string, any>} */
	const schema = {};
	for (const entry of entries) {
		Object.assign(schema, await entry.getSchemas());
	}

	const outputDir = path.join(cwd(), './.svelte-kit/content-thing/generated');
	const dbPath = path.join(outputDir, 'sqlite.db');
	const sqlite = new Database(dbPath);
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
