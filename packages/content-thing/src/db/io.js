import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { exec } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import { walk } from '@content-thing/internal-utils/filesystem';
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
 * @param {string} dbPath
 * @param {string} collectionsDir
 * @param {string[]} collections
 */
export async function loadSQLiteDB(dbPath, collectionsDir, collections) {
	const imports = collections.map((collection) =>
		import(path.join(collectionsDir, collection, 'schema.config.js')),
	);
	/** @type {Record<string, any>} */
	const schema = {};
	for (const imported of await Promise.all(imports)) {
		Object.assign(schema, imported);
	}
	const sqlite = new Database(dbPath);
	const db = drizzle(sqlite, { schema });
	for (const name of collections) {
		const collectionDir = path.join(collectionsDir, name);
		const schemaFilepath = path.join(collectionDir, 'schema.config.js');
		const validatorFilepath = path.join(collectionDir, 'validate.js');
		const [schema, validator] = await Promise.all([
			import(`${schemaFilepath}?t=${Date.now()}`),
			import(`${validatorFilepath}?t=${Date.now()}`),
		]);

		/** @type {any[]} */
		const rows = [];
		walk(collectionDir, (file) => {
			if (file.isDirectory()) return;
			if (!file.name.endsWith('.json')) return;

			const contents = fs.readFileSync(file.fullPath, 'utf-8');
			const json = JSON.parse(contents);
			const validatedJson = writeFileErrors(
				json,
				validator.insert,
				file.parent,
			);
			if (validatedJson) rows.push(validatedJson);
		});

		if (rows.length) {
			await db.insert(schema[name]).values(rows);
		}
	}
}
