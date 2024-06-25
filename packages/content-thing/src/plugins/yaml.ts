import fs from 'node:fs/promises';
import yaml from 'js-yaml';
import type { CollectionPlugin } from './index.js';
import { parseFilepath } from '../helpers/filepath.js';

export const yamlPlugin: CollectionPlugin = {
	name: 'collection-plugin-yaml',
	setup(build) {
		build.onCollectionConfig(
			{ filter: { collection: { type: /^yaml$/ } } },
			() => {
				return Promise.resolve({
					data: {
						fields: {
							_id: {
								type: 'text',
								primaryKey: true,
							},
						},
					},
				});
			},
		);

		build.onLoad(
			{ filter: { path: /\.(yaml|yml)$/, collection: { type: /^yaml$/ } } },
			async ({ path }) => {
				const { entry } = parseFilepath(path);
				const content = await fs.readFile(path, 'utf-8');
				const json = yaml.load(content) as Record<string, unknown>;
				return {
					record: {
						...json,
						_id: entry.id,
					},
				};
			},
		);
	},
};
