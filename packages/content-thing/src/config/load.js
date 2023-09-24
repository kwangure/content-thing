import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

export const drizzlePrimaryKeyConfig = z
	.object({
		autoIncrement: z.boolean().optional(),
		onConflict: z
			.enum(['abort', 'fail', 'ignore', 'replace', 'rollback'])
			.optional(),
	})
	.or(z.boolean());

export const drizzleColumn = z.object({
	nullable: z.boolean().default(false),
	primaryKey: drizzlePrimaryKeyConfig.optional(),
	unique: z.string().or(z.boolean()).default(false),
});

export const drizzleIntegerColumn = drizzleColumn.extend({
	type: z.literal('integer'),
	mode: z.enum(['boolean', 'number', 'timestamp', 'timestamp_ms']).optional(),
	defaultValue: z.number().optional(),
});

export const drizzleTextColumn = drizzleColumn.extend({
	type: z.literal('text'),
	enum: z.string().array().optional(),
	length: z.number().optional(),
	defaultValue: z.string().optional(),
});

export const drizzleJsonColumn = drizzleColumn.extend({
	type: z.literal('json'),
	jsDocType: z.string().default('any'),
	defaultValue: z.string().optional(),
});

export const drizzleOneRelation = z.object({
	type: z.literal('one'),
	collection: z.string(),
	reference: z.string(),
	field: z.string(),
});

export const drizzleManyRelation = z.object({
	type: z.literal('many'),
	collection: z.string(),
});

const dataPropertySchema = z.string().refine(
	(value) => !value.startsWith('_'),
	(value) => ({
		message: `Forbidden property '${value}'. Data property names beginning with underscore are reserved.`,
	}),
);

export const markdownSchema = z
	.object({
		data: z
			.record(
				dataPropertySchema,
				z.discriminatedUnion('type', [
					drizzleIntegerColumn,
					drizzleJsonColumn,
					drizzleTextColumn,
				]),
			)
			.default({}),
	})
	.transform((value) => {
		value.data = {
			...value.data,
			_id: drizzleTextColumn.parse({
				type: 'text',
				primaryKey: true,
			}),
			_headingTree: drizzleJsonColumn.parse({
				type: 'json',
				jsDocType: "import('content-thing').TocEntry[]",
			}),
			_content: drizzleJsonColumn.parse({
				type: 'json',
				jsDocType: "import('content-thing/mdast').Root",
			}),
		};
		return value;
	});

export const markdownConfig = z.object({
	type: z.literal('markdown'),
	schema: markdownSchema,
	relations: z
		.record(
			dataPropertySchema,
			z.discriminatedUnion('type', [drizzleOneRelation, drizzleManyRelation]),
		)
		.optional(),
});

export const yamlSchema = z
	.object({
		data: z.record(
			dataPropertySchema,
			z.discriminatedUnion('type', [
				drizzleIntegerColumn,
				drizzleJsonColumn,
				drizzleTextColumn,
			]),
		),
	})
	.transform((value) => {
		value.data = {
			...value.data,
			_id: drizzleTextColumn.parse({
				type: 'text',
				primaryKey: true,
			}),
		};
		return value;
	});

export const yamlConfig = z.object({
	type: z.literal('yaml'),
	schema: yamlSchema,
	relations: z
		.record(
			z.discriminatedUnion('type', [drizzleOneRelation, drizzleManyRelation]),
		)
		.optional(),
});

export const configSchema = z.discriminatedUnion('type', [
	markdownConfig,
	yamlConfig,
]);

/** @param {string} directory */
export function loadCollectionConfig(directory) {
	const configPath = path.join(directory, 'collection.config.json');
	try {
		const configContent = fs.readFileSync(configPath, 'utf-8');
		const configJSON = JSON.parse(configContent);
		return configSchema.parse(configJSON);
	} catch (_error) {
		if (/** @type {any} */ (_error).code === 'ENOENT') {
			const error = new Error(
				`Could not find a config file at ${configPath}. All collections must have one.`,
			);
			error.cause = _error;
			throw error;
		} else {
			throw _error;
		}
	}
}
