import type { Plugin } from '../../core/plugin.js';
import { Err, Ok } from '../../utils/result.js';
import fs from 'node:fs';

function parseJson(value: string) {
	try {
		return Ok(JSON.parse(value));
	} catch (e) {
		return Err('invalid-json', e as Error);
	}
}

export const collectionConfigPlugin: Plugin = {
	name: 'content-thing-collection-config',
	bundle(build) {
		build.loadCollectionConfig((filepath) => {
			const contents = fs.readFileSync(filepath, 'utf-8');
			const parseResult = parseJson(contents);
			if (!parseResult.ok) {
				parseResult.error.message = `Unable parse collection config at ${JSON.stringify(filepath)}. ${parseResult.error.message}`;
			}
			return parseResult;
		});
	},
};
