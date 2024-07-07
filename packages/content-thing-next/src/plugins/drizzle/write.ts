import type {
	CollectionConfig,
	CollectionConfigMap,
} from '../../config/types.js';
import path from 'node:path';
import { generateRelationImports, generateRelations } from './relations.js';
import { generateSchema } from './schema.js';
import { write } from '@content-thing/internal-utils/filesystem';
import type { ValidatedContentThingOptions } from '../../config/options.js';

export function writeSchema(
	validatedOptions: ValidatedContentThingOptions,
	collectionConfig: CollectionConfig,
) {
	let schemaCode = '';
	if (collectionConfig.data?.relations) {
		schemaCode += generateRelationImports(validatedOptions, collectionConfig);
	}
	const schema = generateSchema(collectionConfig);
	if (!schema.ok) throw schema.error;

	schemaCode += schema.value;
	if (collectionConfig.data?.relations) {
		schemaCode += `\n`;
		schemaCode += `${generateRelations(collectionConfig)}\n\n`;
	}

	const schemaPath = path.join(
		validatedOptions.files.collectionsOutputDir,
		collectionConfig.name,
		'schema.config.js',
	);
	write(schemaPath, schemaCode);
}

export function writeDBClient(
	validatedOptions: ValidatedContentThingOptions,
	collectionConfigMap: CollectionConfigMap,
) {
	let result = `import { Database } from 'content-thing-next/better-sqlite3';\n`;
	result += `import { drizzle } from 'content-thing-next/drizzle-orm/better-sqlite3';\n`;
	result += `// @ts-ignore\n`;
	result += `import dbPath from './sqlite.db';\n`;
	for (const collection of collectionConfigMap.keys()) {
		result += `import * as ${collection} from './collections/${collection}/schema.config.js';\n`;
	}

	const collections = [...collectionConfigMap.keys()];
	if (collections.length) {
		result += `\nconst schema = {\n`;
		for (const collection of collectionConfigMap.keys()) {
			result += `\t...${collection},\n`;
		}
		result += `};\n`;
	} else {
		result += `\nconst schema = /** @type {Record<string, unknown>} */({});`;
	}

	result += `\n`;
	result += `// Vite prepends file:// in production\n`;
	result += `const normalizedDBPath = dbPath.replace(/^[a-zA-Z]+:\\/\\//, '');\n`;
	result += `const sqlite = new Database(normalizedDBPath);\n`;
	result += `export const collections = drizzle(sqlite, { schema });\n`;

	const dbClientFilepath = path.join(validatedOptions.files.outputDir, 'db.js');
	write(dbClientFilepath, result);
}

export function writeSchemaExports(
	validatedOptions: ValidatedContentThingOptions,
	collectionConfigMap: CollectionConfigMap,
) {
	let result = '';
	for (const collection of collectionConfigMap.keys()) {
		result += `export * from './collections/${collection}/schema.config.js';\n`;
	}
	const schemaPath = path.join(
		validatedOptions.files.collectionsOutputDir,
		'schema.js',
	);
	write(schemaPath, result);
}
