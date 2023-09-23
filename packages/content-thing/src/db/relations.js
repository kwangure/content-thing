import path from 'node:path';
import { cwd } from 'node:process';

/**
 * Generates the code for the one relation
 *
 * @param {string} table - The name of the table
 * @param {import("./types").CTOneRelation} relation - The relation configuration for one type
 */
export function generateOneRelationCode(table, relation) {
	let relationCode = `one(${relation.collection}, {\n`;
	relationCode += `\t\tfields: [${table}.${relation.field}],\n`;
	relationCode += `\t\treferences: [${relation.collection}.${relation.reference}],\n`;
	relationCode += `\t}),`;

	return relationCode;
}

/**
 * @param {import("./types").CTRelations} relations
 * @param {string} tableName - The name of the table
 */
export function generateRelations(relations, tableName) {
	const types = [
		...new Set(Object.values(relations).map(({ type }) => type)),
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

/**
 * @param {import("./types").CTRelations} relations
 * @param {string} output The output directory of the current collection
 */
export function generateRelationImports(relations, output) {
	let imports = `import { relations } from 'content-thing/drizzle-orm';\n`;
	const relatedCollections = new Set(
		Object.values(relations).map(({ collection }) => collection),
	);

	const collectionsOutput = path.join(
		cwd(),
		'./.svelte-kit/content-thing/generated/collections',
	);

	for (const name of relatedCollections) {
		if (!relatedCollections.has(name)) continue;
		const outputSchemaPath = path.join(
			collectionsOutput,
			name,
			'schema.config.js',
		);
		const relativePath = path.relative(output, outputSchemaPath);
		imports += `import { ${name} } from '${relativePath}';\n`;
	}

	return imports;
}
