import { generateRelationImports, generateRelations } from '../db/relations.js';
import { generateSchema } from '../db/schema.js';
import { write } from '@content-thing/internal-utils/filesystem';

/**
 * @param {import('../config/types.js').CollectionConfig} config
 */
export function writeSchema(config) {
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

/**
 * @param {string} dbClientPath
 * @param {Set<string>} collections
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
 * @param {string} output
 * @param {Set<string>} collections
 */
export function writeSchemaExports(output, collections) {
	let result = '';
	for (const collection of collections) {
		result += `export * from './collections/${collection}/schema.config.js';\n`;
	}
	write(output, result);
}

/**
 * @param {import('../config/types.js').CollectionConfig} config
 */
export function writeValidator(config) {
	let result = `import { createInsertSchema } from 'content-thing/drizzle-zod';\n`;
	result += `import { ${config.name} } from './schema.config.js'\n`;
	result += `\n`;
	result += `export const insert = createInsertSchema(${config.name});\n`;

	write(config.paths.validator, result);
}
