import fs from 'node:fs/promises';
import yaml from 'js-yaml';
import type { CollectionPlugin, OnLoadResult } from './types.js';
import { parseFilepath } from '../helpers/filepath.js';

export const yamlPlugin: CollectionPlugin = {
	name: 'collection-plugin-yaml',
	setup(build) {
		build.onLoad(
			{ filter: { path: /\.(yaml|yml)$/, collection: { type: /yaml/ } } },
			async ({ path }) => {
				const { entry } = parseFilepath(path);
				const content = await fs.readFile(path, 'utf-8');
				const json = yaml.load(content) as Record<string, any>;
				const loadResult: OnLoadResult = {
					record: {
						...json,
						_id: entry.id,
					},
				};

				return loadResult;
			},
		);
	},
};
