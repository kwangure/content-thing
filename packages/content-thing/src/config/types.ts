import { drizzleJsonColumn, markdownSchema, yamlSchema } from './load.js';
import { z } from 'zod';

export type MarkdownSchema = z.input<typeof markdownSchema>;
export type YamlSchema = z.input<typeof yamlSchema>;
export type CollectionSchema = MarkdownSchema | YamlSchema;

export type JsonColumType = z.input<typeof drizzleJsonColumn>;
