import type { Asset, Bundle } from '../../core/graph.js';
import type { CollectionConfig } from '../../config/types.js';
import type { Plugin } from '../../core/plugin.js';
import type { ValidatedContentThingOptions } from '../../config/options.js';
import { write } from '@content-thing/internal-utils/filesystem';
import path from 'node:path';

const COLLECTION_CONFIG_REGEXP = /[/\\]([^/\\]+)[/\\]collection\.config\.json$/;

interface CollectionConfigBundle extends Bundle {
	meta: {
		collectionConfig: CollectionConfig;
	};
}

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
					id: `${match[1]}-collection-query`,
					meta: {
						collectionConfig: asset.value,
					},
				});
			}
			return bundleConfigs;
		});

		const isCollectionConfigBundle = (
			bundle: Bundle,
		): bundle is CollectionConfigBundle => {
			return (
				bundle.id.endsWith('collection-query') &&
				typeof bundle.meta === 'object' &&
				bundle.meta !== null &&
				'collectionConfig' in bundle.meta
			);
		};

		build.transformBundle({
			filter: isCollectionConfigBundle,
			callback: ({ bundle, graph }) => {
				const { collectionConfig } = bundle.meta as {
					collectionConfig: CollectionConfig;
				};
				const collectionAssets = graph.getDependencies(
					collectionConfig.filepath,
				);
				for (const asset of collectionAssets) {
					bundle.addAsset(asset);
				}

				return bundle;
			},
		});

		build.writeBundle({
			filter: isCollectionConfigBundle,
			callback({ bundle }) {
				const { collectionConfig } = bundle.meta;
				const code = generateDatabaseFile(collectionConfig, bundle.assets);
				const outputFilepath = path.join(
					validatedOptions.files.collectionsOutputDir,
					collectionConfig.name + '.js',
				);
				write(outputFilepath, code);

				return;
			},
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
	const fieldImports = new Set(['createTable']);
	const fields = Object.entries(collectionConfig.data.fields)
		.map(([name, field]) => {
			fieldImports.add(field.type);
			const schemaFunc =
				'jsDocType' in field
					? `/** @type {ReturnType<typeof ${field.type}<'${name}', ${field.jsDocType}>>} */(${field.type}('${name}'))`
					: `${field.type}('${name}')`;
			return `\t\t'${name}': ${schemaFunc},\n`;
		})
		.join('');

	let code = '// This file is auto-generated. Do not edit directly.\n';
	code += `import { ${Array.from(fieldImports).join(', ')} } from "@content-thing/memdb";\n\n`;
	code += `export const ${collectionConfig.name}Table = createTable({\n`;
	code += fields;
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

	return code;
}
