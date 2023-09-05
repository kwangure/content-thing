import { generateMarkdownSchema, generateYamlSchema } from '../db/schema.js';
import { generateRelationImports, generateRelations } from '../db/relations.js';
import fs from 'node:fs';
import path from 'node:path';
import { remarkAttributes } from '@content-thing/remark-attributes';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import { remarkRichAttributes } from '@content-thing/remark-rich-attributes';
import { remarkVariables } from '@content-thing/remark-variables';
import remarkStringify from 'remark-stringify';
import { remarkTableOfContents } from '@content-thing/remark-toc';
import { remarkYamlParse } from '@content-thing/remark-yaml-parse';
import { unified } from 'unified';
import { VFile } from 'vfile';
import { write } from '@content-thing/internal-utils/filesystem';
import yaml from 'js-yaml';

/**
 * @param {import("./types.js").FileInfo[]} files
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
		writeMarkdownData(file);
	}
}

/**
 * @param {import("./types.js").FileInfo[]} files
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
		writeYamlData(file);
	}
}

/**
 * @param {string} dbClientPath
 * @param {string[]} collections
 */
export function writeDBClient(dbClientPath, collections) {
	let result = `import { BETTER_SQLITE3_PATH, Database } from 'content-thing/better-sqlite3';\n`;
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
	result += `const sqlite = new Database(normalizedDBPath, {\n`;
	result += `	nativeBinding: BETTER_SQLITE3_PATH.replace(/^[a-zA-Z]+:\\/\\//, ''),\n`;
	result += `});\n`;
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

const processor = unified()
	.use(remarkParse)
	.use(remarkStringify)
	.use(remarkFrontmatter)
	.use(remarkYamlParse)
	.use(remarkAttributes)
	.use(remarkRichAttributes)
	.use(remarkVariables)
	.use(remarkTableOfContents);

/**
 * @param {import('./types.js').FileInfo} file
 */
export function writeMarkdownData(file) {
	const code = fs.readFileSync(file.input);
	const vfile = new VFile({
		path: file.input,
		value: code,
	});
	const tree = processor.parse(vfile);
	const transformedTree = processor.runSync(tree, vfile);

	/** @type {Record<string, any>} */
	const data = {
		id: file.id,
		content: transformedTree,
		headingTree: vfile.data.tableOfContents,
	};
	const frontmatter = transformedTree.data?.frontmatter;
	if (frontmatter) {
		for (const [key, value] of Object.entries(frontmatter)) {
			data[`data_${key}`] = value;
		}
	}
	write(file.output, JSON.stringify(data, null, 4));
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

/**
 * @param {import('./types.js').FileInfo} file
 */
export function writeYamlData(file) {
	const code = fs.readFileSync(file.input, 'utf-8');
	const json = yaml.load(code);
	/** @type {Record<string, any>} */
	const data = { id: file.id };
	if (json) {
		for (const [key, value] of Object.entries(json)) {
			data[`data_${key}`] = value;
		}
	}
	write(file.output, JSON.stringify(data, null, 4));
}
