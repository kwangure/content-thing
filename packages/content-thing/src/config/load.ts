import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import type { CollectionConfig } from './types';
import { Err, Ok } from '../result.js';
import type { ThingConfig } from '../state/state';

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

export const plaintextSchema = z
	.object({
		data: z.object({}).default({}),
	})
	.strict()
	.transform((value) => {
		value.data = {
			_id: drizzleTextColumn.parse({
				type: 'text',
				primaryKey: true,
			}),
			_content: drizzleJsonColumn.parse({
				type: 'json',
				jsDocType: "import('content-thing/mdast').Root",
			}),
		};
		return value;
	});

export const plaintextConfig = z
	.object({
		$schema: z.string().optional(),
		type: z.literal('plaintext'),
		schema: plaintextSchema.optional(),
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

export const jsonSchema = z
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

export const jsonConfig = z
	.object({
		$schema: z.string().optional(),
		type: z.literal('json'),
		schema: jsonSchema,
		relations: z
			.record(
				z.discriminatedUnion('type', [drizzleOneRelation, drizzleManyRelation]),
			)
			.optional(),
	})
	.strict();

export const configSchema = z.discriminatedUnion('type', [
	jsonConfig,
	markdownConfig,
	plaintextConfig,
	yamlConfig,
]);

export function loadCollectionConfig(
	thingConfig: ThingConfig,
	collectionName: string,
) {
	const configPath = path.join(
		thingConfig.collectionsDir,
		collectionName,
		'collection.config.json',
	);

	let configContent;
	try {
		configContent = fs.readFileSync(configPath, 'utf-8');
	} catch (_error) {
		let type =
			(_error as any).code === 'ENOENT'
				? ('file-not-found' as const)
				: ('read-file-error' as const);
		Object.assign(_error as any, { collection: collectionName });
		return Err(type, _error as Error & { collection: string });
	}

	let configJSON;
	try {
		configJSON = JSON.parse(configContent);
	} catch (_error) {
		Object.assign(_error as any, { collection: collectionName });
		return Err('json-parse-error', _error as Error & { collection: string });
	}

	let parseResult = configSchema.safeParse(configJSON);
	let validatedJSON;
	if (parseResult.success) {
		validatedJSON = parseResult.data;
	} else {
		return Err('validation-error', parseResult.error);
	}

	return Ok({ ...validatedJSON, name: collectionName } as CollectionConfig);
}
