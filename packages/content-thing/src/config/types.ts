import {
	drizzleIntegerColumn,
	drizzleJsonColumn,
	drizzleManyRelation,
	drizzleOneRelation,
	drizzleTextColumn,
	markdownConfig,
	markdownSchema,
	yamlConfig,
	yamlSchema,
} from './load.js';
import { z } from 'zod';

export type TextColumn = z.output<typeof drizzleTextColumn>;
export type IntegerColumn = z.output<typeof drizzleIntegerColumn>;
export type JsonColumn = z.output<typeof drizzleJsonColumn>;
export type ColumnType = IntegerColumn | JsonColumn | TextColumn;

export type OneRelation = z.output<typeof drizzleOneRelation>;
export type ManyRelation = z.output<typeof drizzleManyRelation>;

export type MarkdownSchema = z.output<typeof markdownSchema>;
export type YamlSchema = z.output<typeof yamlSchema>;
export type CollectionSchema = MarkdownSchema | YamlSchema;

export type MarkdownConfig = z.output<typeof markdownConfig>;
export type YamlConfig = z.output<typeof yamlConfig>;
export type CollectionConfig = (MarkdownConfig | YamlConfig) & {
	name: string;
};
