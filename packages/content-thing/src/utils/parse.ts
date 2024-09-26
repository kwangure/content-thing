import { Err, Ok } from './result.js';
import YAML from 'yaml';

export function parseJson(value: string) {
	try {
		return Ok(JSON.parse(value));
	} catch (e) {
		return Err('invalid-json', e as Error);
	}
}

export function parseYaml(value: string) {
	try {
		return Ok(YAML.parse(value));
	} catch (e) {
		return Err('invalid-yaml', e as Error);
	}
}
