import type { MarkdownEntry } from './markdown.js';
import type { YamlEntry } from './yaml.js';

export interface EntryOptions {
	collectionsDir: string;
	outputDir: string;
}

export interface EntryRecord {
	id: string;
	[x: string]: any;
}

export type CollectionEntry = MarkdownEntry | YamlEntry;
