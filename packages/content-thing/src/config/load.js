import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

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
	.strict()
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

export const markdownConfig = z
	.object({
		$schema: z.string().optional(),
		type: z.literal('markdown'),
		schema: markdownSchema,
		relations: z
			.record(
				dataPropertySchema,
				z.discriminatedUnion('type', [drizzleOneRelation, drizzleManyRelation]),
			)
			.optional(),
	})
	.strict();

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
	.strict()
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

export const yamlConfig = z
	.object({
		$schema: z.string().optional(),
		type: z.literal('yaml'),
		schema: yamlSchema,
		relations: z
			.record(
				z.discriminatedUnion('type', [drizzleOneRelation, drizzleManyRelation]),
			)
			.optional(),
	})
	.strict();

export const configSchema = z.discriminatedUnion('type', [
	markdownConfig,
	yamlConfig,
]);

/**
 * @param {string} rootDir
 * @param {string} collectionsOutput
 * @return {import('./types').CollectionConfig}
 */
export function loadCollectionConfig(rootDir, collectionsOutput) {
	const configPath = path.join(rootDir, 'collection.config.json');
	const name = path.basename(rootDir);
	const outputDir = path.join(collectionsOutput, name);
	const schemaPath = path.join(outputDir, 'schema.config.js');
	const validatorPath = path.join(outputDir, 'validate.js');
	try {
		const configContent = fs.readFileSync(configPath, 'utf-8');
		const configJSON = JSON.parse(configContent);
		return {
			...configSchema.parse(configJSON),
			name,
			paths: {
				config: configPath,
				schema: schemaPath,
				validator: validatorPath,
				rootDir,
				outputDir,
			},
		};
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
