import { MarkdownEntry } from './entry/markdown.js';
import { walk } from '@content-thing/internal-utils/filesystem';
import { YamlEntry } from './entry/yaml.js';

/**
 * @param {import('../config/types.js').ValidatedCollectionConfig} collection
 */
export function getMarkdownCollectionEntries(collection) {
	/** @type {MarkdownEntry[]} */
	const collectionManifest = [];
	walk(collection.paths.rootDir, (file) => {
		if (file.name.toLowerCase() !== 'readme.md') return;

		collectionManifest.push(new MarkdownEntry(file.fullPath));
	});

	return collectionManifest;
}

/**
 * @param {import('../config/types.js').ValidatedCollectionConfig} collection
 */
export function getYamlCollectionInputs(collection) {
	/** @type {YamlEntry[]} */
	const collectionManifest = [];
	walk(collection.paths.rootDir, (file) => {
		if (file.name.toLowerCase() !== 'data.yaml') return;

		collectionManifest.push(new YamlEntry(file.fullPath));
	});

	return collectionManifest;
}
