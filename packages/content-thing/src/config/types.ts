import * as v from 'valibot';
import { CollectionConfigSchema } from './schema.js';

export type CollectionConfig = v.InferOutput<typeof CollectionConfigSchema>;
