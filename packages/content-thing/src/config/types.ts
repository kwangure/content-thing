import {
	collectionConfig,
	integerField,
	jsonField,
	stringField,
} from './schema.js';
import * as v from 'valibot';

export type StringField = v.InferOutput<typeof stringField>;
export type IntegerField = v.InferOutput<typeof integerField>;
export type JsonField = v.InferOutput<typeof jsonField>;
export type FieldType = IntegerField | JsonField | StringField;

export type CollectionConfig = v.InferOutput<typeof collectionConfig> & {
	name: string;
	filepath: string;
};
export type CollectionConfigMap = Map<string, CollectionConfig>;
