import { BaseEntry } from './base.js';
import type { EntryRecord } from './types.js';

export class JsonEntry extends BaseEntry {
	type = 'json';
	getRecord() {
		const json = JSON.parse(this.value) as Record<string, any>;

		return {
			...json,
			_id: this.id,
		} as EntryRecord;
	}
}
