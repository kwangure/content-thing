import * as v from 'valibot';

export const integerField = v.strictObject({
	type: v.literal('integer'),
	nullable: v.optional(v.boolean(), false),
});

export const stringField = v.strictObject({
	type: v.literal('string'),
});

export const jsonField = v.strictObject({
	type: v.literal('json'),
	jsDocType: v.optional(v.string(), 'any'),
});

export const collectionData = v.strictObject({
	fields: v.optional(
		v.record(v.string(), v.union([integerField, stringField, jsonField])),
		{},
	),
});

export const collectionConfig = v.strictObject({
	type: v.string(),
	data: v.optional(collectionData, {}),
});
