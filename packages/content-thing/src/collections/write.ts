import type { CollectionConfig, CollectionConfigMap } from '../config/types.js';
import { generateRelationImports, generateRelations } from '../db/relations.js';
import { generateSchema } from '../db/schema.js';
import { write } from '@content-thing/internal-utils/filesystem';
import path from 'node:path';
import type { ThingConfig } from '../state/state.js';

export function writeSchema(
	thingConfig: ThingConfig,
	collectionConfig: CollectionConfig,
) {
	let schemaCode = '';
	if (collectionConfig.data?.relations) {
		schemaCode += generateRelationImports(thingConfig, collectionConfig);
	}
	const schema = generateSchema(collectionConfig);
	if (!schema.ok) throw schema.error;

	schemaCode += schema.value;
	if (collectionConfig.data?.relations) {
		schemaCode += `\n`;
		schemaCode += `${generateRelations(collectionConfig)}\n\n`;
	}

	const schemaPath = path.join(
		thingConfig.collectionsOutput,
		collectionConfig.name,
		'schema.config.js',
	);
	write(schemaPath, schemaCode);
}

export function writeDBClient(
	thingConfig: ThingConfig,
	collectionConfigMap: CollectionConfigMap,
) {
	let result = `import { Database } from 'content-thing/better-sqlite3';\n`;
	result += `import { drizzle } from 'content-thing/drizzle-orm/better-sqlite3';\n`;
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

	const dbClientPath = path.join(thingConfig.outputDir, 'db.js');
	write(dbClientPath, result);
}

export function writeSchemaExports(
	thingConfig: ThingConfig,
	collectionConfigMap: CollectionConfigMap,
) {
	let result = '';
	for (const collection of collectionConfigMap.keys()) {
		result += `export * from './collections/${collection}/schema.config.js';\n`;
	}
	const schemaPath = path.join(thingConfig.outputDir, 'schema.js');
	write(schemaPath, result);
}

export function writeValidator(
	thingConfig: ThingConfig,
	config: CollectionConfig,
) {
	let result = `import { createInsertSchema } from 'content-thing/drizzle-zod';\n`;
	result += `import { ${config.name} } from './schema.config.js'\n`;
	result += `\n`;
	result += `export const insert = createInsertSchema(${config.name});\n`;

	const validatorPath = path.join(
		thingConfig.collectionsOutput,
		config.name,
		'validate.js',
	);
	write(validatorPath, result);
}
