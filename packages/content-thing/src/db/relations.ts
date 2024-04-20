import path from 'node:path';
import type { ThingConfig } from '../state/state.js';
import type { CollectionConfig, OneRelation } from '../config/types.js';

/**
 * Generates the code for the one relation
 *
 * @param table - The name of the table
 * @param relation - The relation configuration for one type
 */
export function generateOneRelationCode(table: string, relation: OneRelation) {
	let relationCode = `one(${relation.collection}, {\n`;
	relationCode += `\t\tfields: [${table}.${relation.field}],\n`;
	relationCode += `\t\treferences: [${relation.collection}.${relation.reference}],\n`;
	relationCode += `\t}),`;

	return relationCode;
}

export function generateRelations(collectionConfig: CollectionConfig) {
	const { relations, name: tableName } = collectionConfig;
	const types = [
		...new Set(Object.values(relations ?? {}).map(({ type }) => type)),
	].sort();
	let relationCode = `export const ${tableName}Relations = relations(${tableName}, ({ ${types.join(
		', ',
	)} }) => ({\n`;
	for (const name in relations) {
		const relation = relations[name];
		if (relation.type === 'one') {
			relationCode += `\t${name}: ${generateOneRelationCode(
				tableName,
				relation,
			)}\n`;
		} else {
			relationCode += `\t${name}: many(${relation.collection}),\n`;
		}
	}
	relationCode += `}));\n`;
	return relationCode;
}

export function generateRelationImports(
	thingConfig: ThingConfig,
	collectionConfig: CollectionConfig,
) {
	let imports = `import { relations } from 'content-thing/drizzle-orm';\n`;

	const relatedCollections = new Set(
		Object.values(collectionConfig.relations ?? {}).map(
			({ collection }) => collection,
		),
	);

	const collectionOutput = path.join(
		thingConfig.collectionsOutput,
		collectionConfig.name,
	);
	for (const name of relatedCollections) {
		if (!relatedCollections.has(name)) continue;
		const outputSchemaPath = path.join(
			thingConfig.collectionsOutput,
			name,
			'schema.config.js',
		);
		const relativePath = path.relative(collectionOutput, outputSchemaPath);
		imports += `import { ${name} } from '${relativePath}';\n`;
	}

	return imports;
}
