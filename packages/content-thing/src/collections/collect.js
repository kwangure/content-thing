import fs from 'node:fs';
import { MarkdownEntry } from './entry/markdown.js';
import path from 'node:path';
import { walk } from '@content-thing/internal-utils/filesystem';
import { YamlEntry } from './entry/yaml.js';

/**
 * @param {string} input The parent directory of input collections
 * @param {string} output The parent directory of output collections
 */
export function getCollections(input, output) {
	const collections = [];
	/** @type {fs.Dirent[]} */
	let entries = [];
	if (fs.existsSync(input)) {
		entries = fs.readdirSync(input, { withFileTypes: true });
	} else {
		console.log(
			`Create collections at '${input}' to get started with content-thing.`,
		);
	}
	for (const entry of entries) {
		if (entry.isFile()) {
			throw Error(`Only collection directories are allowed at the top level`);
		}
		collections.push({
			name: entry.name,
			input: path.join(input, entry.name),
			output: path.join(output, entry.name),
		});
	}
	return collections;
}

/**
 * @param {import('./types.js').CollectionInfo} collection
 * @param {string} collectionsDir
 * @param {string} outputDir
 */
export function getMarkdownCollectionEntries(
	collection,
	collectionsDir,
	outputDir,
) {
	/**
	 * @type {MarkdownEntry[]}
	 */
	const collectionManifest = [];
	walk(collection.input, (file) => {
		if (file.name.toLowerCase() !== 'readme.md') return;

		collectionManifest.push(
			new MarkdownEntry(file.fullPath, {
				collectionsDir,
				outputDir,
			}),
		);
	});

	return collectionManifest;
}

/**
 * @param {import('./types.js').CollectionInfo} collection
 * @param {string} collectionsDir
 * @param {string} outputDir
 */
export function getYamlCollectionInputs(collection, collectionsDir, outputDir) {
	/**
	 * @type {YamlEntry[]}
	 */
	const collectionManifest = [];
	walk(collection.input, (file) => {
		if (file.name.toLowerCase() !== 'data.yaml') return;

		collectionManifest.push(
			new YamlEntry(file.fullPath, {
				collectionsDir,
				outputDir,
			}),
		);
	});

	return collectionManifest;
}
