import * as v from 'valibot';

export const integerFieldSchema = v.strictObject({
	type: v.literal('integer'),
	nullable: v.optional(v.boolean(), false),
});

export const stringFieldSchema = v.strictObject({
	type: v.literal('string'),
});

export const jsonFieldSchema = v.strictObject({
	type: v.literal('json'),
	jsDocType: v.optional(v.string(), 'any'),
});

export const collectionData = v.strictObject({
	fields: v.optional(
		v.record(
			v.string(),
			v.union([integerFieldSchema, stringFieldSchema, jsonFieldSchema]),
		),
		{},
	),
	search: v.optional(v.array(v.string()), []),
});

export const collectionConfigSchema = v.strictObject({
	name: v.string(),
	filepath: v.string(),
	type: v.string(),
	data: v.optional(collectionData, {}),
});
