import { BaseEntry } from './base.js';
import { write } from '@content-thing/internal-utils/filesystem';
import yaml from 'js-yaml';

export class YamlEntry extends BaseEntry {
	type = 'yaml';
	getRecord() {
		const json = yaml.load(this.value);

		/** @type {import('./types.js').EntryRecord} */
		const data = super.getRecord();

		if (json) {
			for (const [key, value] of Object.entries(json)) {
				data[`data_${key}`] = value;
			}
		}

		return data;
	}
	writeOutput() {
		write(this.output, JSON.stringify(this.getRecord(), null, 4));
	}
}
