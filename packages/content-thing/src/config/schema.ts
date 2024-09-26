import * as v from 'valibot';

const numberFieldSchema = v.strictObject({
	type: v.literal('number'),
	nullable: v.optional(v.boolean(), false),
});

const stringFieldSchema = v.strictObject({
	type: v.literal('string'),
	nullable: v.optional(v.boolean(), false),
});

const jsonFieldSchema = v.strictObject({
	type: v.literal('json'),
	typeScriptType: v.optional(v.string(), 'any'),
	nullable: v.optional(v.boolean(), false),
});

export const CollectionFieldsSchema = v.optional(
	v.record(
		v.string(),
		v.variant('type', [numberFieldSchema, stringFieldSchema, jsonFieldSchema]),
	),
	{},
);

export const CollectionConfigSchema = v.strictObject({
	filepath: v.string(),
	type: v.string(),
	data: v.optional(
		v.strictObject({
			fields: CollectionFieldsSchema,
		}),
		{},
	),
});
