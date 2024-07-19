import path from 'node:path';
import type { Plugin } from '../../core/plugin.js';
import type { ValidatedContentThingOptions } from '../../config/options.js';
import type { CollectionConfig } from '../../config/types.js';
import type { Asset } from '../../core/graph.js';
import { write } from '@content-thing/internal-utils/filesystem';
import { fieldToSchema } from './schema.js';
import { Ok } from '../../utils/result.js';

const COLLECTION_CONFIG_REGEXP = /\/([^/]+)\/collection\.config\.json$/;

export const memdbPlugin: Plugin = {
	name: 'content-thing-memdb',
	bundle(build) {
		let validatedOptions: ValidatedContentThingOptions;

		build.configResolved((_config) => {
			validatedOptions = _config;
		});

		build.createBundle((graph) => {
			const { assets } = graph;
			const bundleConfigs = [];
			for (const asset of assets) {
				const match = asset.id.match(COLLECTION_CONFIG_REGEXP);
				if (!match) continue;
				bundleConfigs.push({
					id: `${match[1]}-collection`,
					meta: {
						collectionConfig: asset.value,
					},
				});
			}
			return bundleConfigs;
		});

		build.transformBundle(({ bundle, graph }) => {
			if (
				typeof bundle.meta !== 'object' ||
				bundle.meta === null ||
				!('collectionConfig' in bundle.meta)
			)
				return bundle;

			const collectionConfig = bundle.meta.collectionConfig as CollectionConfig;
			const collectionAssets = graph.getDependencies(collectionConfig.filepath);
			for (const asset of collectionAssets) {
				bundle.addAsset(asset);
			}

			return bundle;
		});

		build.writeBundle((bundle) => {
			if (
				typeof bundle.meta !== 'object' ||
				bundle.meta === null ||
				!('collectionConfig' in bundle.meta)
			)
				return;

			const collectionConfig = bundle.meta.collectionConfig as CollectionConfig;
			const code = generateDatabaseFile(collectionConfig, bundle.assets);
			if (!code.ok) {
				code.error.message = `Failed to generate database file for collection "${collectionConfig.name}" at "${collectionConfig.filepath}". ${code.error.message}`;
				throw code.error;
			}

			const outputFilepath = path.join(
				validatedOptions.files.collectionsOutputDir,
				collectionConfig.name + '.js',
			);
			write(outputFilepath, code.value);

			return;
		});
	},
};

/**
 * @param {CollectionConfig} collectionConfig
 * @param {Array<{value: {record: object}}>} assets
 * @returns {string}
 */
function generateDatabaseFile(
	collectionConfig: CollectionConfig,
	assets: Asset[],
) {
	let code = '// This file is auto-generated. Do not edit directly.\n';
	code +=
		'import { createTable, custom, string, number } from "@content-thing/memdb";\n\n';
	code += `export const ${collectionConfig.name} = createTable({\n`;
	for (const [name, field] of Object.entries(collectionConfig.data.fields)) {
		const schemaResult = fieldToSchema(name, field);
		if (schemaResult.ok) {
			code += `\t\t'${name}': ${schemaResult.value},\n`;
		} else {
			return schemaResult;
		}
		code += `\t\t'${name}': ${schemaResult.value},\n`;
	}
	code += '\t},\n';
	code += '\t[\n';
	for (const asset of assets) {
		code +=
			'\t\t' +
			JSON.stringify(
				(asset.value as { record: object }).record,
				null,
				4,
			).replace(/\n/g, '\n\t\t') +
			',\n';
	}
	code += '\t]\n';
	code += ');\n\n';

	return Ok(code);
}
