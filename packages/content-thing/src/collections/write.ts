import type { CollectionConfig } from '../config/types.js';
import { generateRelationImports, generateRelations } from '../db/relations.js';
import { generateSchema } from '../db/schema.js';
import { write } from '@content-thing/internal-utils/filesystem';

export function writeSchema(config: CollectionConfig) {
	let schemaCode = '';
	if (config.relations) {
		schemaCode += generateRelationImports(
			config.relations,
			config.paths.outputDir,
		);
	}
	schemaCode += generateSchema(config.schema, config.name);
	if (config.relations) {
		schemaCode += `\n`;
		schemaCode += `${generateRelations(config.relations, config.name)}\n\n`;
	}

	write(config.paths.schema, schemaCode);
}

export function writeDBClient(dbClientPath: string, collections: Set<string>) {
	let result = `import { createCollection } from 'content-thing';\n`;
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
	result += `export const collections = createCollection(dbPath, { schema });\n`;

	write(dbClientPath, result);
}

export function writeSchemaExports(output: string, collections: Set<string>) {
	let result = '';
	for (const collection of collections) {
		result += `export * from './collections/${collection}/schema.config.js';\n`;
	}
	write(output, result);
}

export function writeValidator(config: CollectionConfig) {
	let result = `import { createInsertSchema } from 'content-thing/drizzle-zod';\n`;
	result += `import { ${config.name} } from './schema.config.js'\n`;
	result += `\n`;
	result += `export const insert = createInsertSchema(${config.name});\n`;

	write(config.paths.validator, result);
}
