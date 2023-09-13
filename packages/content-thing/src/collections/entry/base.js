import fs from 'node:fs';
import path from 'node:path';

const COLLECTION_FILE_RE =
	/^\/?(?<collection>[^\/]+)\/(?<id>.+)\/(?<basename>[^\/]+)$/;

export class BaseEntry {
	/** @type {Record<string, any>} */
	data = {};
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
		const { collectionsDir, outputDir } = options;
		if (!filepath.startsWith(collectionsDir)) {
			throw Error(
				`Entry filepapth '${filepath}' is not in '${collectionsDir}'`,
			);
		}
		const baseFilepath = filepath.substring(collectionsDir.length);
		const matchResult = baseFilepath.match(COLLECTION_FILE_RE);
		if (!matchResult?.groups) {
			throw Error(`Filepath '${filepath}' is not a valid collection entry.`);
		}
		const { collection, id, basename } = matchResult.groups;
		this.__collection = collection;
		this.__id = id;
		this.__basename = basename;
		this.__filepath = filepath;
		this.__outputDir = outputDir;
	}
	get basename() {
		return this.__basename;
	}
	get collection() {
		return this.__collection;
	}
	get filepath() {
		return this.__filepath;
	}
	get id() {
		return this.__id;
	}
	get output() {
		return path.join(
			this.__outputDir,
			'collections',
			this.__collection,
			this.__id,
			'output.json',
		);
	}
	toString() {
		return this.value;
	}
	get value() {
		return fs.readFileSync(this.__filepath, 'utf-8');
	}
}
