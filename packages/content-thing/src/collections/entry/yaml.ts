import { BaseEntry } from './base.js';
import yaml from 'js-yaml';
import type { EntryRecord } from './types.js';

export class YamlEntry extends BaseEntry {
	type = 'yaml';
	getRecord() {
		const json = yaml.load(this.value) as Record<string, any>;

		return {
			...json,
			_id: this.id,
		} as EntryRecord;
	}
}
