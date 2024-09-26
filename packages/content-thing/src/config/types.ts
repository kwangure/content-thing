import * as v from 'valibot';
import { CollectionConfigSchema, CollectionFieldsSchema } from './schema.js';

export type CollectionConfig = v.InferOutput<typeof CollectionConfigSchema>;
export type CollectionConfigFields = v.InferOutput<
	typeof CollectionFieldsSchema
>;
