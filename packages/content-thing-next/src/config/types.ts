import {
	collectionConfig,
	drizzleIntegerColumn,
	drizzleJsonColumn,
	drizzleManyRelation,
	drizzleOneRelation,
	drizzleTextColumn,
	pluginCollectionConfig,
} from './schema.js';
import * as v from 'valibot';

export type TextColumn = v.InferOutput<typeof drizzleTextColumn>;
export type IntegerColumn = v.InferOutput<typeof drizzleIntegerColumn>;
export type JsonColumn = v.InferOutput<typeof drizzleJsonColumn>;
export type ColumnType = IntegerColumn | JsonColumn | TextColumn;

export type OneRelation = v.InferOutput<typeof drizzleOneRelation>;
export type ManyRelation = v.InferOutput<typeof drizzleManyRelation>;

export type PluginCollectionConfig = v.InferInput<
	typeof pluginCollectionConfig
>;
export type CollectionConfig = v.InferOutput<typeof collectionConfig> & {
	name: string;
};
export type CollectionConfigMap = Map<string, CollectionConfig>;
