import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from '../../core/plugin.js';
import type { Asset } from '../../core/graph.js';
import { walk } from '@content-thing/internal-utils/filesystem';
import YAML from 'yaml';
import { parseFilepath } from '../../utils/filepath.js';
import { mergeInto } from '../../utils/object.js';

const YAML_REGEXP = /(?:^|[/\\])readme\.(yaml|yml)$/i;
const COLLECTION_CONFIG_REGEXP = /[/\\]([^/\\]+)[/\\]collection\.config\.json$/;

interface YamlAsset extends Asset {
	value: string;
}

interface CollectionConfigAsset extends Asset {
	value: {
		type: 'yaml';
		[key: string]: unknown;
	};
}

const isYamlFile = (id: string): id is string => YAML_REGEXP.test(id);

const isCollectionConfig = (asset: Asset): asset is CollectionConfigAsset => {
	return (
		COLLECTION_CONFIG_REGEXP.test(asset.id) &&
		typeof asset.value === 'object' &&
		asset.value !== null &&
		'type' in asset.value &&
		asset.value.type === 'yaml'
	);
};

const isYamlAsset = (asset: Asset): asset is YamlAsset =>
	YAML_REGEXP.test(asset.id) && typeof asset.value === 'string';

export const yamlPlugin: Plugin = {
	name: 'content-thing-yaml',
	bundle(build) {
		build.loadId<string>({
			filter: isYamlFile,
			callback: (id) => {
				const value = fs.readFileSync(id, 'utf-8');
				return { value };
			},
		});

		build.transformAsset<CollectionConfigAsset>({
			filter: isCollectionConfig,
			callback: (asset) => {
				mergeInto(asset.value, {
					data: {
						fields: {
							_id: {
								type: 'string',
							},
						},
					},
				});

				return asset;
			},
		});

		build.transformAsset<YamlAsset>({
			filter: isYamlAsset,
			callback: (asset) => {
				const { entry } = parseFilepath(asset.id);
				const value = YAML.parse(asset.value);

				Object.assign(asset, {
					value: {
						record: {
							...value,
							_id: entry.id,
						},
					},
				});

				return asset;
			},
		});

		build.loadDependencies<CollectionConfigAsset>({
			filter: isCollectionConfig,
			callback: ({ id }) => {
				const collectionDir = path.dirname(id);
				const yamlEntries: string[] = [];
				walk(collectionDir, (dirent) => {
					if (dirent.name.match(YAML_REGEXP) && dirent.isFile()) {
						yamlEntries.push(path.join(dirent.path, dirent.name));
					}
				});

				return yamlEntries;
			},
		});
	},
};
