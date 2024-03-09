import path from 'node:path';
import { walk } from '@content-thing/internal-utils/filesystem';
import type { CollectionConfig } from '../config/types.js';
import type { ThingConfig } from '../state/state.js';

const README_RE = /^readme\./i;
export function isReadme(filename: string) {
	return README_RE.test(filename);
}

export function getCollectionEntries(
	thingConfig: ThingConfig,
	collection: CollectionConfig,
) {
	const collectionEntries: string[] = [];
	const collectionDir = path.join(thingConfig.collectionsDir, collection.name);
	walk(collectionDir, (file) => {
		if (!isReadme(file.name)) return;
		const fullPath = path.join(file.fullPath);
		collectionEntries.push(fullPath);
	});

	return collectionEntries;
}
