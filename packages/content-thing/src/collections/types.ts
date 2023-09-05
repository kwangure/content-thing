import type { CTMarkdownSchema, CTRelations, CTYamlSchema } from '../db/types';

export interface CollectionInfo {
	/** The name of a collection */
	name: string;
	/** The filepath to an input collection directory */
	input: string;
	/** The filepath to an output collection directory */
	output: string;
}

export interface FileInfo {
	/** The base directory relative the the collections folder */
	id: string;
	/** The input filepath */
	input: string;
	/** The output filepath */
	output: string;
}

export interface CTMarkdownConfig {
	type: 'markdown';
	relations?: CTRelations;
	schema: CTMarkdownSchema;
}

export interface CTYamlConfig {
	type: 'yaml';
	relations?: CTRelations;
	schema: CTYamlSchema;
}
