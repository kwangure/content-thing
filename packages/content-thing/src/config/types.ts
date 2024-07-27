import {
	collectionConfigSchema,
	integerFieldSchema,
	jsonFieldSchema,
	stringFieldSchema,
} from './schema.js';
import * as v from 'valibot';

export type StringField = v.InferOutput<typeof stringFieldSchema>;
export type IntegerField = v.InferOutput<typeof integerFieldSchema>;
export type JsonField = v.InferOutput<typeof jsonFieldSchema>;
export type FieldType = IntegerField | JsonField | StringField;

export type CollectionConfig = v.InferOutput<typeof collectionConfigSchema> & {
	name: string;
	filepath: string;
};
export type CollectionConfigMap = Map<string, CollectionConfig>;
