import { BaseEntry } from './base.js';
import { write } from '@content-thing/internal-utils/filesystem';
import yaml from 'js-yaml';

export class YamlEntry extends BaseEntry {
	type = 'yaml';
	processValue() {
		return yaml.load(this.value);
	}
	writeOutput() {
		const json = this.processValue();

		/** @type {Record<string, any>} */
		const data = {
			id: this.id,
		};

		if (json) {
			for (const [key, value] of Object.entries(json)) {
				data[`data_${key}`] = value;
			}
		}

		write(this.output, JSON.stringify(data, null, 4));
	}
}
