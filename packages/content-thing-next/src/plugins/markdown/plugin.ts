import fs from 'node:fs';
// import path from 'node:path';
import type { Plugin } from '../../core/plugin.js';

const README_REGEXP = /(^|\/)readme\.md$/i;
const COLLECTION_CONFIG_REGEXP = /(.*\/)collection\.config\.json$/;

export const collectionConfigPlugin: Plugin = {
	name: 'content-thing-markdown',
	bundle(build) {
		build.loadId({ filter: README_REGEXP }, (id) => {
			const value = fs.readFileSync(id, 'utf-8');

			return { value };
		});

		build.loadDependencies(
			{ filter: COLLECTION_CONFIG_REGEXP },
			({ value }) => {
				if (
					typeof value !== 'object' ||
					value === null ||
					!('type' in value) ||
					value.type !== 'markdown'
				)
					return [];

				// const collectionDir = path.dirname(id);

				// TODO: Walk dir collecting file paths matching `README_REGEXP`

				return [];
			},
		);
	},
};
