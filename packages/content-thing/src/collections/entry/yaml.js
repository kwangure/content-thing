import { BaseEntry } from './base.js';
import yaml from 'js-yaml';

export class YamlEntry extends BaseEntry {
	type = 'yaml';
	getRecord() {
		const json = /** @type {Record<string, any>} */ (yaml.load(this.value));

		return /** @type {import('./types.js').EntryRecord} */ ({
			...json,
			_id: this.id,
		});
	}
}
