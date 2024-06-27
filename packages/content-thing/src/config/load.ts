import { z } from 'zod';
import type { CollectionConfigMap } from './types';
import { Err, Ok } from '../result.js';

export const drizzleColumn = z
	.object({
		nullable: z.boolean().default(false),
		primaryKey: z.boolean().optional(),
		unique: z.string().or(z.boolean()).optional(),
	})
	.strict();

export const drizzleIntegerColumn = drizzleColumn
	.extend({
		type: z.literal('integer'),
		mode: z.enum(['boolean', 'number', 'timestamp', 'timestamp_ms']).optional(),
		defaultValue: z.number().optional(),
		primaryKey: z
			.object({
				autoIncrement: z.boolean().optional(),
				onConflict: z
					.enum(['abort', 'fail', 'ignore', 'replace', 'rollback'])
					.optional(),
			})
			.strict()
			.or(z.boolean())
			.optional(),
	})
	.strict();

export const drizzleTextColumn = drizzleColumn
	.extend({
		type: z.literal('text'),
		enum: z.string().array().optional(),
		length: z.number().optional(),
		defaultValue: z.string().optional(),
	})
	.strict();

export const drizzleJsonColumn = drizzleColumn
	.extend({
		type: z.literal('json'),
		jsDocType: z.string().default('any'),
		defaultValue: z
			.record(z.any())
			.transform((value) => JSON.stringify(value))
			.optional(),
	})
	.strict();

export const drizzleOneRelation = z
	.object({
		type: z.literal('one'),
		collection: z.string(),
		reference: z.string(),
		field: z.string(),
	})
	.strict();

export const drizzleManyRelation = z
	.object({
		type: z.literal('many'),
		collection: z.string(),
	})
	.strict();

export const collectionData = z
	.object({
		fields: z
			.record(
				z.string(),
				z.discriminatedUnion('type', [
					drizzleIntegerColumn,
					drizzleJsonColumn,
					drizzleTextColumn,
				]),
			)
			.default({}),
		relations: z
			.record(
				z.string(),
				z.discriminatedUnion('type', [drizzleOneRelation, drizzleManyRelation]),
			)
			.optional(),
	})
	.strict();

export const collectionConfig = z
	.object({
		$schema: z.string().optional(),
		type: z.string(),
		data: collectionData.default({}),
	})
	.strict();

export const pluginCollectionConfig = z
	.object({
		data: collectionData.default({}),
	})
	.strict();

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
