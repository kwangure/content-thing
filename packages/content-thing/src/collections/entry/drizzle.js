import { BaseEntry } from './base.js';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import { writeFileErrors } from '../write.js';

/**
 * @param {any} schema
 * @param {BaseEntry} entry
 */
function createDrizzle(schema, entry) {
	const dbPath = path.join(entry.__outputDir, 'sqlite.db');
	const sqlite = new Database(dbPath);
	return drizzle(sqlite, {
		schema: {
			[entry.collection]: schema,
		},
	});
}

/**
 * @param {import("drizzle-orm/better-sqlite3").BetterSQLite3Database<{ [x:string]: any }>} db
 * @param {BaseEntry} entry
 */
export async function writeToStorage(db, entry) {
	const schema = await entry
		.getSchemas()
		.then((schemas) => schemas[entry.collection]);
	const validator = await entry.getValidators().then(({ insert }) => insert);
	const data = entry.getRecord();

	if (!db) {
		db = createDrizzle(schema, entry);
	}

	const validatedJson = writeFileErrors(
		data,
		validator,
		path.join(entry.outputDir, 'collections', entry.collection, entry.id),
	);
	db.insert(schema).values(validatedJson).onConflictDoUpdate({
		target: schema.id,
		set: validatedJson,
	});
}
