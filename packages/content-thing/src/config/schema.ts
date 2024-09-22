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
	jsDocType: v.optional(v.string(), 'any'),
	nullable: v.optional(v.boolean(), false),
});

export const collectionData = v.strictObject({
	fields: v.optional(
		v.record(
			v.string(),
			v.variant('type', [
				numberFieldSchema,
				stringFieldSchema,
				jsonFieldSchema,
			]),
		),
		{},
	),
	search: v.optional(
		v.strictObject({
			fields: v.optional(v.array(v.string()), []),
		}),
		{ fields: [] as string[] },
	),
});

export const collectionConfigSchema = v.strictObject({
	name: v.string(),
	filepath: v.string(),
	type: v.string(),
	data: v.optional(collectionData, {}),
});
