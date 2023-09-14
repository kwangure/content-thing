import { BaseEntry } from './base.js';
import { createRequire } from 'node:module';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import { writeFileErrors } from '../write.js';

const require = createRequire(import.meta.url);

export class DrizzleEntry extends BaseEntry {
	getRecord() {
		return /** @type {Record<string, any> & { id: string }} */ ({
			id: this.id,
		});
	}
	/**
	 * @param {any} schema
	 */
	createDrizzle(schema) {
		const dbPath = path.join(this.outputDir, 'sqlite.db');
		const sqlite = new Database(dbPath);
		return drizzle(sqlite, {
			schema: {
				[this.collection]: schema,
			},
		});
	}
	getSchemas() {
		const schemaFilepath = path.join(this.collectionDir, 'schema.config.js');
		return require(schemaFilepath);
	}
	getValidators() {
		const validatorFilepath = path.join(this.collectionDir, 'validate.js');
		return require(validatorFilepath);
	}
	/**
	 * @param {import("drizzle-orm/better-sqlite3").BetterSQLite3Database<{ [x:string]: any }>} db
	 */
	writeToStorage(db) {
		const schema = this.getSchemas()[this.collection];
		const validator = this.getValidators().insert;
		const data = this.getRecord();

		if (!db) {
			db = this.createDrizzle(schema);
		}

		const validatedJson = writeFileErrors(data, validator, this.collectionDir);
		db.insert(schema).values(validatedJson).onConflictDoUpdate({
			target: schema.id,
			set: validatedJson,
		});
	}
}
