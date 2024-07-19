import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from '../../core/plugin.js';
import type { ValidatedContentThingOptions } from '../../config/options.js';

const COLLECTION_CONFIG_REGEXP = /\/([^/]+)\/collection\.config\.json$/;

export const collectionConfigPlugin: Plugin = {
	name: 'content-thing-collection-config',
	bundle(build) {
		let validatedOptions: ValidatedContentThingOptions;

		build.configResolved((_config) => {
			validatedOptions = _config;
		});

		build.addEntryAssetIds(() => {
			const { collectionsDir } = validatedOptions.files;
			if (!fs.existsSync(collectionsDir)) return [];

			const configFiles = [];
			for (const entry of fs.readdirSync(collectionsDir, {
				withFileTypes: true,
			})) {
				if (!entry.isDirectory()) continue;

				const configPath = path.join(
					collectionsDir,
					entry.name,
					'collection.config.json',
				);
				if (fs.existsSync(configPath)) {
					configFiles.push(configPath);
				}
			}

			return configFiles;
		});

		build.loadId({ filter: COLLECTION_CONFIG_REGEXP }, (id) => {
			const match = id.match(COLLECTION_CONFIG_REGEXP)!;
			const contents = fs.readFileSync(id, 'utf-8');
			const value = JSON.parse(contents);
			value.filepath = id;
			value.name = match[1];

			return { value };
		});
	},
};