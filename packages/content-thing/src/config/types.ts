import {
	drizzleJsonColumn,
	markdownConfig,
	markdownSchema,
	yamlConfig,
	yamlSchema,
} from './load.js';
import { z } from 'zod';

export type JsonColumType = z.input<typeof drizzleJsonColumn>;

export type MarkdownSchema = z.input<typeof markdownSchema>;
export type YamlSchema = z.input<typeof yamlSchema>;
export type CollectionSchema = MarkdownSchema | YamlSchema;

export type MarkdownConfig = z.infer<typeof markdownConfig>;
export type YamlConfig = z.infer<typeof yamlConfig>;
export type CollectionConfig = MarkdownConfig | YamlConfig;
