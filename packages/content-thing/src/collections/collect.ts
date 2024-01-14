import path from 'node:path';
import { MarkdownEntry } from './entry/markdown.js';
import { walk } from '@content-thing/internal-utils/filesystem';
import { YamlEntry } from './entry/yaml.js';
import type { CollectionConfig } from '../config/types.js';
import type { ThingConfig } from '../state/state.js';

export function getMarkdownCollectionEntries(
	thingConfig: ThingConfig,
	collection: CollectionConfig,
) {
	const collectionManifest: MarkdownEntry[] = [];
	const collectionDir = path.join(thingConfig.collectionsDir, collection.name);
	walk(collectionDir, (file) => {
		if (file.name.toLowerCase() !== 'readme.md') return;

		collectionManifest.push(new MarkdownEntry(file.fullPath));
	});

	return collectionManifest;
}

export function getYamlCollectionEntries(
	thingConfig: ThingConfig,
	collection: CollectionConfig,
) {
	const collectionManifest: YamlEntry[] = [];
	const collectionDir = path.join(thingConfig.collectionsDir, collection.name);
	walk(collectionDir, (file) => {
		if (file.name.toLowerCase() !== 'data.yaml') return;

		collectionManifest.push(new YamlEntry(file.fullPath));
	});

	return collectionManifest;
}
