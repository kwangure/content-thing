import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from '../../core/plugin.js';
import { walk } from '@content-thing/internal-utils/filesystem';
import YAML from 'yaml';
import { parseFilepath } from '../../utils/filepath.js';

const YAML_REGEXP = /(^|\/)readme\.(yaml|yml)$/i;
const COLLECTION_CONFIG_REGEXP = /(.*\/)collection\.config\.json$/;

export const yamlPlugin: Plugin = {
	name: 'content-thing-yaml',
	bundle(build) {
		build.loadId({ filter: YAML_REGEXP }, (id) => {
			const value = fs.readFileSync(id, 'utf-8');
			return { value };
		});

		build.transformAsset({ filter: YAML_REGEXP }, (asset) => {
			if (typeof asset.value !== 'string') return asset;

			const { entry } = parseFilepath(asset.id);
			const value = YAML.parse(asset.value);
			asset.value = {
				record: {
					...value,
					_id: entry.id,
				},
			};

			return asset;
		});

		build.loadDependencies(
			{ filter: COLLECTION_CONFIG_REGEXP },
			({ id, value }) => {
				if (
					typeof value !== 'object' ||
					value === null ||
					!('type' in value) ||
					value.type !== 'yaml'
				)
					return [];

				const collectionDir = path.dirname(id);
				const markdownEntries: string[] = [];
				walk(collectionDir, (dirent) => {
					if (dirent.name.match(YAML_REGEXP) && dirent.isFile()) {
						markdownEntries.push(path.join(dirent.path, dirent.name));
					}
				});

				return markdownEntries;
			},
		);
	},
};
