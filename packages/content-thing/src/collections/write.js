import { generateMarkdownSchema, generateYamlSchema } from '../db/schema.js';
import { generateRelationImports, generateRelations } from '../db/relations.js';
import path from 'node:path';
import { write } from '@content-thing/internal-utils/filesystem';

/**
 * @param {import('./entry/markdown.js').MarkdownEntry[]} files
 * @param {import('./types.js').CTMarkdownConfig} config
 * @param {import('./types.js').CollectionInfo} collection
 * @param {Record<string, string>} collectionOutputs
 */
export async function outputMarkdownCollection(
	files,
	config,
	collection,
	collectionOutputs,
) {
	const schemaPath = path.join(collection.output, 'schema.config.js');
	let schemaCode = '';
	if (config.relations) {
		schemaCode += generateRelationImports(
			config.relations,
			collectionOutputs,
			collection.output,
		);
	}
	schemaCode += generateMarkdownSchema(config.schema, collection.name);
	if (config.relations) {
		schemaCode += `\n`;
		schemaCode += generateRelations(config.relations, collection.name);
	}

	writeValidator(collection);
	write(schemaPath, schemaCode);
	for (const file of files) {
		file.writeOutput();
	}
}

/**
 * @param {import('./entry/yaml.js').YamlEntry[]} files
 * @param {import('./types.js').CTYamlConfig} config
 * @param {import('./types.js').CollectionInfo} collection
 * @param {Record<string, string>} collectionOutputs
 */
export function outputYamlCollection(
	files,
	config,
	collection,
	collectionOutputs,
) {
	let schemaCode = '';
	if (config.relations) {
		schemaCode += generateRelationImports(
			config.relations,
			collectionOutputs,
			collection.output,
		);
	}
	schemaCode += generateYamlSchema(config.schema, collection.name);
	if (config.relations) {
		schemaCode += `\n`;
		schemaCode += `${generateRelations(config.relations, collection.name)}\n\n`;
	}

	writeValidator(collection);
	write(path.join(collection.output, 'schema.config.js'), schemaCode);
	for (const file of files) {
		file.writeOutput();
	}
}

/**
 * @param {string} dbClientPath
 * @param {string[]} collections
 */
export function writeDBClient(dbClientPath, collections) {
	let result = `import { Database } from 'content-thing/better-sqlite3';\n`;
	result += `import { drizzle } from 'content-thing/drizzle-orm/better-sqlite3';\n`;
	result += `// @ts-ignore\n`;
	result += `import dbPath from './sqlite.db';\n`;
	for (const collection of collections) {
		result += `import * as ${collection} from './collections/${collection}/schema.config.js';\n`;
	}
	result += `\nconst schema = {\n`;
	for (const collection of collections) {
		result += `\t...${collection},\n`;
	}
	result += `};\n`;
	result += `\n`;
	result += `// Vite prepends file:// in production\n`;
	result += `const normalizedDBPath = dbPath.replace(/^[a-zA-Z]+:\\/\\//, '');\n`;
	result += `const sqlite = new Database(normalizedDBPath);\n`;
	result += `export const collections = drizzle(sqlite, { schema });\n`;

	write(dbClientPath, result);
}

/**
 * @param {any} object
 * @param {import('zod').ZodSchema} schema
 * @param {string} directory
 */
export function writeFileErrors(object, schema, directory) {
	const parsed = schema.safeParse(object);
	let errors = { _errors: /** @type {string[]} */ ([]) };
	let result = null;
	if (parsed.success) {
		result = parsed.data;
	} else {
		errors = parsed.error.format();
	}
	const errorFilePath = path.join(directory, 'errors.json');
	write(errorFilePath, JSON.stringify(errors, null, 4));
	return result;
}

/**
 * @param {string} output
 * @param {string[]} collections
 */
export function writeSchemaExporter(output, collections) {
	let result = '';
	for (const collection of collections) {
		result += `export * from './collections/${collection}/schema.config.js';\n`;
	}
	write(output, result);
}

/**
 * @param {import('./types.js').CollectionInfo} collection
 */
function writeValidator(collection) {
	let result = `import { createInsertSchema } from 'content-thing/drizzle-zod';\n`;
	result += `import { ${collection.name} } from './schema.config.js'\n`;
	result += `\n`;
	result += `export const insert = createInsertSchema(${collection.name});\n`;

	write(path.join(collection.output, 'validate.js'), result);
}
