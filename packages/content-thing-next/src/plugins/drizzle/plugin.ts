import Database, { type Database as DB } from '@signalapp/better-sqlite3';
import type { Plugin } from '../../core/plugin.js';
import {
	createTableFromSchema,
	deleteFromTable,
	dropTable,
	insertIntoTable,
} from './db.js';
import type {
	CollectionConfig,
	CollectionConfigMap,
} from '../../config/types.js';
import { mkdirp } from '@content-thing/internal-utils/filesystem';
import { writeDBClient, writeSchema, writeSchemaExports } from './write.js';
import type { ValidatedContentThingOptions } from '../../config/options.js';

const README_REGEXP = /(^|\/)readme\.[a-z.]+$/i;
const COLLECTION_CONFIG_REGEXP = /\/([^/]+)\/collection\.config\.json$/;

export const drizzlePlugin: Plugin = {
	name: 'content-thing-plugin-drizzle',
	bundle(build) {
		let db: DB;
		let validatedOptions: ValidatedContentThingOptions;
		build.configResolved((_config) => {
			mkdirp(_config.files.outputDir);
			db = new Database(_config.files.dbFilepath);
			validatedOptions = _config as ValidatedContentThingOptions;
		});

		const collectionConfigMap: CollectionConfigMap = new Map();
		build.writeAsset({ filter: COLLECTION_CONFIG_REGEXP }, (asset) => {
			const collectionConfig = asset.value as CollectionConfig;
			writeSchema(validatedOptions, collectionConfig);
			dropTable(db, collectionConfig);
			createTableFromSchema(db, collectionConfig);

			collectionConfigMap.set(collectionConfig.name, collectionConfig);
			writeSchemaExports(validatedOptions, collectionConfigMap);
			writeDBClient(validatedOptions, collectionConfigMap);
		});

		build.writeAsset({ filter: README_REGEXP }, (asset) => {
			if (
				typeof asset.value !== 'object' ||
				asset.value === null ||
				!('record' in asset.value) ||
				typeof asset.value.record !== 'object' ||
				asset.value.record === null
			) {
				return;
			}
			const { entryAssets, value } = asset;
			const record = value.record as Record<string, unknown>;

			for (const asset of entryAssets) {
				const collectionConfig = asset.value as CollectionConfig;

				deleteFromTable(db, collectionConfig, { _id: record._id });
				insertIntoTable(db, collectionConfig, record);
			}
		});
	},
};
