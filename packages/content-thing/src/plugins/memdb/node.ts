import path from 'node:path';
import type { Plugin } from '../../core/plugin.js';
import type { ValidatedContentThingOptions } from '../../config/options.js';
import type { CollectionConfig } from '../../config/types.js';
import type { Asset } from '../../core/graph.js';
import { write } from '@content-thing/internal-utils/filesystem';
import { Err, Ok } from '../../utils/result.js';

const COLLECTION_CONFIG_REGEXP = /[/\\]([^/\\]+)[/\\]collection\.config\.json$/;

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

		build.transformBundle(({ bundle, graph }) => {
			if (!bundle.id.endsWith('collection-query')) return bundle;

			const { collectionConfig } = bundle.meta as {
				collectionConfig: CollectionConfig;
			};
			const collectionAssets = graph.getDependencies(collectionConfig.filepath);
			for (const asset of collectionAssets) {
				bundle.addAsset(asset);
			}

			return bundle;
		});

		build.writeBundle((bundle) => {
			if (!bundle.id.endsWith('collection-query')) return;

			const { collectionConfig } = bundle.meta as {
				collectionConfig: CollectionConfig;
			};
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
	const imports = new Set(['createTable']);
	function createTable() {
		let code = `export const ${collectionConfig.name}Table = createTable({\n`;
		for (const [name, field] of Object.entries(collectionConfig.data.fields)) {
			let schemaFunc;
			if (field.type === 'string') {
				imports.add('string');
				schemaFunc = `string('${name}')`;
			} else if (field.type === 'integer') {
				imports.add('number');
				schemaFunc = `number('${name}')`;
			} else if (field.type === 'json') {
				imports.add('custom');
				schemaFunc = `/** @type {ReturnType<typeof custom<'${name}', ${field.jsDocType}>>} */(custom('${name}'))`;
			} else {
				/* eslint-disable @typescript-eslint/no-unused-vars */
				// Will type-error if new fields are unhandled
				const exhaustiveCheck: never = field;

				return Err(
					'field-type-not-found',
					new Error(`Field type not found for field "${name}".`),
				);
			}

			code += `\t\t'${name}': ${schemaFunc},\n`;
		}
		return Ok(code);
	}
	const table = createTable();
	if (!table.ok) return table;

	let code = '// This file is auto-generated. Do not edit directly.\n';
	code += `import { ${Array.from(imports).join(', ')} } from "@content-thing/memdb";\n\n`;
	code += table.value;
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
