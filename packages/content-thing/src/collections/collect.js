import fs from 'node:fs';
import path from 'node:path';
import { walk } from '@content-thing/internal-utils/filesystem';

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
 */
export function getMarkdownCollectionInputs(collection) {
	/**
	 * @type {import('./types.js').FileInfo[]}
	 */
	const collectionManifest = [];
	walk(collection.input, (entry) => {
		if (entry.name.toLowerCase() !== 'readme.md') return;

		collectionManifest.push({
			id: entry.baseDir,
			input: entry.fullPath,
			output: path.join(collection.output, entry.basePath, 'output.json'),
		});
	});

	return collectionManifest;
}

/**
 * @param {import('./types.js').CollectionInfo} collection
 */
export function getYamlCollectionInputs(collection) {
	/**
	 * @type {import('./types.js').FileInfo[]}
	 */
	const collectionManifest = [];
	walk(collection.input, (file) => {
		if (file.name.toLowerCase() !== 'data.yaml') return;

		collectionManifest.push({
			id: file.baseDir,
			input: file.fullPath,
			output: path.join(collection.output, file.basePath, 'output.json'),
		});
	});

	return collectionManifest;
}
