import * as v from 'valibot';
import { collectionConfigSchema } from './schema.js';

export type CollectionConfig = v.InferOutput<typeof collectionConfigSchema> & {
	name: string;
	filepath: string;
};
