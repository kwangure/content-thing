import type { MarkdownEntry } from './markdown.js';
import type { YamlEntry } from './yaml.js';

export interface EntryRecord {
	_id: string;
	[x: string]: any;
}

export interface BaseEntryConfig {
	basename: string;
	filepath: string;
	id: string;
}

export type CollectionEntry = MarkdownEntry | YamlEntry;
