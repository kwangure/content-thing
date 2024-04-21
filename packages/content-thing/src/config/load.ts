import { z } from 'zod';

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
