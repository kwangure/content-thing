import fs from 'node:fs';
import { parseFilepath } from '../helpers/filepath.js';
import type { CollectionPlugin } from './index.js';

export const plaintextPlugin: CollectionPlugin = {
	name: 'collection-plugin-plaintext',
	setup(build) {
		build.onCollectionConfig(
			{ filter: { collection: { type: /^plaintext$/ } } },
			async () => {
				return {
					data: {
						fields: {
							_id: {
								type: 'text',
								primaryKey: true,
							},
							_content: {
								type: 'text',
							},
						},
					},
				};
			},
		);

		build.onLoad(
			{ filter: { collection: { type: /^plaintext$/ } } },
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
