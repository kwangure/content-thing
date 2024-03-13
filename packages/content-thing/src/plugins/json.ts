import fs from 'node:fs/promises';
import type { CollectionPlugin, OnLoadResult } from './types.js';
import { parseFilepath } from './util.js';

export const jsonPlugin: CollectionPlugin = {
	name: 'collection-plugin-json',
	setup(build) {
		build.onLoad(
			{ filter: { path: /\.json$/, collection: { type: /json/ } } },
			async ({ path }) => {
				const { entry } = parseFilepath(path);
				const content = await fs.readFile(path, 'utf-8');
				const json = JSON.parse(content) as Record<string, any>;
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
