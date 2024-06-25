import fs from 'node:fs/promises';
import { parseFilepath } from '../helpers/filepath.js';
import type { CollectionPlugin } from './index.js';

export const jsonPlugin: CollectionPlugin = {
	name: 'collection-plugin-json',
	setup(build) {
		build.onLoad(
			{ filter: { path: /\.json$/, collection: { type: /^json$/ } } },
			async ({ path }) => {
				const { entry } = parseFilepath(path);
				const content = await fs.readFile(path, 'utf-8');
				const json = JSON.parse(content) as Record<string, unknown>;
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
