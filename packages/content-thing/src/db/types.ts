import { z } from 'zod';
import type {
	drizzleIntegerColumn,
	drizzleTextColumn,
	markdownSchema,
	yamlSchema,
} from '../config/load.js';

export type CTInteger = z.input<typeof drizzleIntegerColumn>;

export type CTText = z.input<typeof drizzleTextColumn>;

export type CTMarkdownSchema = z.input<typeof markdownSchema>;

export type CTYamlSchema = z.input<typeof yamlSchema>;

export interface CTOneRelation {
	type: 'one';
	collection: string;
	reference: string;
	field: string;
}

export interface CTManyRelation {
	type: 'many';
	collection: string;
}

export interface CTRelations {
	[x: string]: CTOneRelation | CTManyRelation;
}
