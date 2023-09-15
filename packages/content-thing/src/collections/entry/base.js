import { cwd } from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

export class BaseEntry {
	/**
	 * Make `unified` to treat `BaseEntry` like a `VFile`
	 * @type {any}
	 */
	messages = [];
	// Make `unified` to treat `BaseEntry` like a `VFile`
	message() {}
	/**
	 * @param {string} filepath
	 * @param {import("./types").EntryOptions} options
	 */
	constructor(filepath, options) {
		const { collectionsDir } = options;
		const { collection, entry } = BaseEntry.parseFilepath(filepath);
		if (!filepath.startsWith(collectionsDir)) {
			throw Error(
				`Entry filepapth '${filepath}' is not in '${collectionsDir}'`,
			);
		}

		this.__collection = collection.name;
		this.__id = entry.id;
		this.__basename = entry.basename;
		this.__filepath = filepath;
		this.__collectionsDir = collectionsDir;
	}
	get basename() {
		return this.__basename;
	}
	get dirname() {
		return path.dirname(this.__filepath);
	}
	get collection() {
		return this.__collection;
	}
	get collectionsDir() {
		return this.__collectionsDir;
	}
	get filepath() {
		return this.__filepath;
	}
	get id() {
		return this.__id;
	}
	get output() {
		return path.join(
			cwd(),
			'.svelte-kit/content-thing/generated/collections',
			this.__collection,
			this.__id,
			'output.json',
		);
	}
	/**
	 * @param {string} filepath
	 */
	static parseFilepath(filepath) {
		const matcher = new RegExp(
			`${cwd()}/src/thing/collections/([^/]+)/(.+)/([^/]+)$`,
		);
		const match = matcher.exec(filepath);
		if (!match) {
			throw Error(`Filepath '${filepath}' is not a valid collection entry.`);
		}
		const [, collection, id, basename] = match;
		return {
			collection: {
				name: collection,
				filepath: path.join(cwd(), '/src/thing/collections/', collection),
			},
			entry: /** @type {import('./types').BaseEntryConfig} */ ({
				filepath,
				id,
				basename,
			}),
		};
	}
	toString() {
		return this.value;
	}
	get value() {
		return fs.readFileSync(this.__filepath, 'utf-8');
	}
	getRecord() {
		return /** @type {Record<string, any> & { id: string }} */ ({
			id: this.id,
		});
	}
	getSchemas() {
		const schemaFilepath = path.join(
			cwd(),
			'.svelte-kit/content-thing/generated/collections',
			this.collection,
			'schema.config.js',
		);
		return import(schemaFilepath);
	}
	getValidators() {
		const validatorFilepath = path.join(
			cwd(),
			'.svelte-kit/content-thing/generated/collections',
			this.collection,
			'validate.js',
		);
		return import(validatorFilepath);
	}
}
