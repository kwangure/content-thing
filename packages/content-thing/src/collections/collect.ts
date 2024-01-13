import { MarkdownEntry } from './entry/markdown.js';
import { walk } from '@content-thing/internal-utils/filesystem';
import { YamlEntry } from './entry/yaml.js';
import type { CollectionConfig } from '../config/types.js';

export function getMarkdownCollectionEntries(collection: CollectionConfig) {
	const collectionManifest: MarkdownEntry[] = [];
	walk(collection.paths.rootDir, (file) => {
		if (file.name.toLowerCase() !== 'readme.md') return;

		collectionManifest.push(new MarkdownEntry(file.fullPath));
	});

	return collectionManifest;
}

export function getYamlCollectionEntries(collection: CollectionConfig) {
	const collectionManifest: YamlEntry[] = [];
	walk(collection.paths.rootDir, (file) => {
		if (file.name.toLowerCase() !== 'data.yaml') return;

		collectionManifest.push(new YamlEntry(file.fullPath));
	});

	return collectionManifest;
}
