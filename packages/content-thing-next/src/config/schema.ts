import * as v from 'valibot';
import type { CollectionConfigMap } from './types.js';
import { Err, Ok } from '../utils/result.js';

export const drizzleColumn = v.strictObject({
	nullable: v.optional(v.boolean(), false),
	primaryKey: v.optional(
		v.union([
			v.strictObject({
				autoIncrement: v.optional(v.boolean()),
				onConflict: v.optional(
					v.union([
						v.literal('abort'),
						v.literal('fail'),
						v.literal('ignore'),
						v.literal('replace'),
						v.literal('rollback'),
					]),
				),
			}),
			v.boolean(),
		]),
	),
	unique: v.optional(v.union([v.string(), v.boolean()])),
});

export const drizzleIntegerColumn = v.intersect([
	drizzleColumn,
	v.strictObject({
		type: v.literal('integer'),
		mode: v.optional(
			v.union([
				v.literal('boolean'),
				v.literal('number'),
				v.literal('timestamp'),
				v.literal('timestamp_ms'),
			]),
		),
		defaultValue: v.optional(v.number()),
	}),
]);

export const drizzleTextColumn = v.intersect([
	drizzleColumn,
	v.strictObject({
		type: v.literal('text'),
		enum: v.optional(v.array(v.string())),
		length: v.optional(v.number()),
		defaultValue: v.optional(v.string()),
	}),
]);

export const drizzleJsonColumn = v.intersect([
	drizzleColumn,
	v.strictObject({
		type: v.literal('json'),
		jsDocType: v.optional(v.string(), 'any'),
		defaultValue: v.pipe(
			v.record(v.string(), v.any()),
			v.transform((value) => JSON.stringify(value)),
		),
	}),
]);

export const drizzleOneRelation = v.strictObject({
	type: v.literal('one'),
	collection: v.string(),
	reference: v.string(),
	field: v.string(),
});

export const drizzleManyRelation = v.strictObject({
	type: v.literal('many'),
	collection: v.string(),
});

export const collectionData = v.strictObject({
	fields: v.optional(
		v.record(
			v.string(),
			v.union([drizzleIntegerColumn, drizzleTextColumn, drizzleJsonColumn]),
		),
		{},
	),
	relations: v.optional(
		v.record(v.string(), v.union([drizzleOneRelation, drizzleManyRelation])),
	),
});

export const collectionConfig = v.strictObject({
	$schema: v.optional(v.string()),
	type: v.string(),
	data: v.optional(collectionData, {}),
});

export const pluginCollectionConfig = v.strictObject({
	data: v.optional(collectionData, {}),
});

export function validateSchemaRelations(configMap: CollectionConfigMap) {
	const issues = [];
	for (const [collectionName, config] of configMap.entries()) {
		const relations = config.data.relations;
		if (!relations) continue;

		for (const relation of Object.values(relations)) {
			const relatedConfig = configMap.get(relation.collection);
			if (!relatedConfig) {
				issues.push({
					message: `Collection config of "${collectionName}" references non-existent collection "${relation.collection}".`,
				});
			}
			if (relation.type === 'one') {
				if (!(relation.field in config.data.fields)) {
					const fields = Object.keys(config.data.fields);
					let message = `Collection config of "${collectionName}" references non-existent field in own config.`;
					if (fields.length) {
						message += ` Expected one of: "${fields.join('", "')}".`;
					}
					issues.push({ message });
				}
				if (
					relatedConfig &&
					!(relation.reference in relatedConfig.data.fields)
				) {
					const fields = Object.keys(relatedConfig.data.fields);
					let message = `Collection config of "${collectionName}" references non-existent field "${relation.reference}" in "${relation.collection}" collection.`;
					if (fields.length) {
						message += ` Expected one of: "${fields.join('", "')}".`;
					}
					issues.push({ message });
				}
			}
		}
	}

	if (issues.length) {
		const error = new Error(`Invalid config relations.`) as Error & {
			issues: typeof issues;
		};
		error.issues = issues;
		return Err('invalid-schema', error);
	}

	return Ok();
}
