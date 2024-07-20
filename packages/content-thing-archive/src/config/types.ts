import {
	collectionConfig,
	drizzleIntegerColumn,
	drizzleJsonColumn,
	drizzleManyRelation,
	drizzleOneRelation,
	drizzleTextColumn,
	pluginCollectionConfig,
} from './load.js';
import { z } from 'zod';

export type TextColumn = z.output<typeof drizzleTextColumn>;
export type IntegerColumn = z.output<typeof drizzleIntegerColumn>;
export type JsonColumn = z.output<typeof drizzleJsonColumn>;
export type ColumnType = IntegerColumn | JsonColumn | TextColumn;

export type OneRelation = z.output<typeof drizzleOneRelation>;
export type ManyRelation = z.output<typeof drizzleManyRelation>;

export type PluginCollectionConfig = z.input<typeof pluginCollectionConfig>;
export type CollectionConfig = z.output<typeof collectionConfig> & {
	name: string;
};
export type CollectionConfigMap = Map<string, CollectionConfig>;
