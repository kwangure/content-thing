import { cwd } from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

export class BaseEntry {
	__basename: string;
	__collection: string;
	__filepath: string;
	__id: string;
	constructor(filepath: string) {
		const { collection, entry } = BaseEntry.parseFilepath(filepath);

		this.__collection = collection.name;
		this.__id = entry.id;
		this.__basename = entry.basename;
		this.__filepath = filepath;
	}
	get basename() {
		return this.__basename;
	}
	get dirname() {
		return path.dirname(this.__filepath);
	}
	get id() {
		return this.__id;
	}
	static parseFilepath(filepath: string) {
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
			entry: {
				filepath,
				id,
				basename,
			},
		};
	}
	toString() {
		return this.value;
	}
	get value() {
		return fs.readFileSync(this.__filepath, 'utf-8');
	}
}
