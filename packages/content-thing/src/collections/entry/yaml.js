import { BaseEntry } from './base.js';
import { write } from '@content-thing/internal-utils/filesystem';
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
	writeOutput() {
		write(this.output, JSON.stringify(this.getRecord(), null, 4));
	}
}
