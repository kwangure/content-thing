import type { Plugin } from '../../core/plugin.js';
import { parseJson } from '../../utils/parse.js';
import fs from 'node:fs';

export const collectionConfigPlugin: Plugin = {
	name: 'content-thing-collection-config',
	bundle(build) {
		build.loadCollectionConfig((filepath) => {
			const contents = fs.readFileSync(filepath, 'utf-8');
			const parseResult = parseJson(contents);
			if (!parseResult.ok) {
				parseResult.meta.message = `Unable parse collection config at ${JSON.stringify(filepath)}. ${parseResult.meta.message}`;
			}
			return parseResult;
		});
	},
};
