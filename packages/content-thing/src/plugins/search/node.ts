import path from 'node:path';
import type { Plugin } from '../../core/plugin.js';
import type { ValidatedContentThingOptions } from '../../config/options.js';
import type { CollectionConfig } from '../../config/types.js';
import { write } from '@content-thing/internal-utils/filesystem';
import { Ok } from '../../utils/result.js';

const COLLECTION_CONFIG_REGEXP = /[/\\]([^/\\]+)[/\\]collection\.config\.json$/;

export interface SearchImportList {
	defaultImport?: string;
	namedImports?: string[];
}

export interface Field {
	serializer: string;
	imports?: Map<string, SearchImportList>;
}

export type FieldMap = Map<string, Field>;

export interface SearchMeta {
	collectionConfig: CollectionConfig;
	fields: FieldMap;
}

export const searchPlugin: Plugin = {
	name: 'content-thing-memdb-search',
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

				const collectionConfig = asset.value as CollectionConfig;

				const fields: FieldMap = new Map();
				for (const fieldName of collectionConfig.data.search.fields) {
					const field = collectionConfig.data.fields[fieldName];
					let serializer = '';
					if (field.type === 'string') {
						serializer = '';
					} else if (field.type === 'integer') {
						serializer = 'String';
					} else if (field.type === 'json') {
						serializer = 'JSON.stringify';
					} else {
						/* eslint-disable @typescript-eslint/no-unused-vars */
						// Will type-error if new fields are unhandled
						const exhaustiveCheck: never = field;
					}
					fields.set(fieldName, { serializer });
				}

				bundleConfigs.push({
					id: `${match[1]}-collection-search`,
					meta: {
						collectionConfig,
						fields,
					},
				});
			}
			return bundleConfigs;
		});

		build.writeBundle((bundle) => {
			if (!bundle.id.endsWith('collection-search')) return;

			const { collectionConfig, fields } = bundle.meta as SearchMeta;
			const code = generateSearchFile(collectionConfig, fields);
			const outputFilepath = path.join(
				validatedOptions.files.collectionsOutputDir,
				collectionConfig.name + '.search.js',
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
function generateSearchFile(
	collectionConfig: CollectionConfig,
	fields: FieldMap,
) {
	let code = '// This file is auto-generated. Do not edit directly.\n';
	code += 'import { createSearchIndex, search } from "@content-thing/memdb";\n';
	code += `import { ${collectionConfig.name}Table } from "./${collectionConfig.name}.js";\n`;
	for (const { imports } of fields.values()) {
		if (imports) {
			for (const [path, { defaultImport, namedImports }] of imports) {
				code += `import { ${namedImports?.join(', ') ?? ''} } `;
				if (defaultImport) {
					code += `, ${defaultImport} `;
				}
				code += `from "${path}";\n`;
			}
		}
	}
	code += '\n';
	code += `const {\n`;
	code += '\tinvertedIndex,\n';
	code += '\tdocumentLengths,\n';
	code += '\taverageDocumentLength,\n';
	code += `} = createSearchIndex(${collectionConfig.name}Table, {\n`;
	for (const [fieldName, { serializer }] of fields) {
		code += `\t'${fieldName}': (s) => ${serializer}(s),\n`;
	}
	code += `});\n\n`;
	code += '/** @param {string} query */\n';
	code += `export const ${collectionConfig.name}Search = (query) => search(\n`;
	code += `\t${collectionConfig.name}Table,\n`;
	code += '\tinvertedIndex,\n';
	code += '\tdocumentLengths,\n';
	code += '\taverageDocumentLength,\n';
	code += '\tquery,\n';
	code += ');\n\n';

	return Ok(code);
}
