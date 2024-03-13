import type { CollectionPlugin } from './types';
import fs from 'node:fs';
import { parseFilepath } from './util.js';

export const plaintextPlugin: CollectionPlugin = {
	name: 'collection-plugin-plaintext',
	setup(build) {
		build.onLoad(
			{ filter: { collection: { type: /plaintext/ } } },
			async ({ path }) => {
				const { entry } = parseFilepath(path);
				const _content = await fs.promises.readFile(path, 'utf-8');
				return {
					record: {
						_content,
						_id: entry.id,
					},
				};
			},
		);
	},
};
