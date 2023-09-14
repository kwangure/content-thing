import { BaseEntry } from './base.js';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import { writeFileErrors } from '../write.js';

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
		const dbPath = path.join(this.__outputDir, 'sqlite.db');
		const sqlite = new Database(dbPath);
		return drizzle(sqlite, {
			schema: {
				[this.collection]: schema,
			},
		});
	}
	getSchemas() {
		const schemaFilepath = path.join(
			this.outputDir,
			'collections',
			this.collection,
			'schema.config.js',
		);
		return import(schemaFilepath);
	}
	getValidators() {
		const validatorFilepath = path.join(
			this.outputDir,
			'collections',
			this.collection,
			'validate.js',
		);
		return import(validatorFilepath);
	}
	/**
	 * @param {import("drizzle-orm/better-sqlite3").BetterSQLite3Database<{ [x:string]: any }>} db
	 */
	async writeToStorage(db) {
		const schema = await this.getSchemas().then(
			(schemas) => schemas[this.collection],
		);
		const validator = await this.getValidators().then(({ insert }) => insert);
		const data = this.getRecord();

		if (!db) {
			db = this.createDrizzle(schema);
		}

		const validatedJson = writeFileErrors(
			data,
			validator,
			path.join(this.outputDir, 'collections', this.collection, this.id),
		);
		db.insert(schema).values(validatedJson).onConflictDoUpdate({
			target: schema.id,
			set: validatedJson,
		});
	}
}
