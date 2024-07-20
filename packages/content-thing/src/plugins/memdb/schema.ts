import type { FieldType, JsonField } from '../../config/types.js';
import { Err, Ok } from '../../utils/result.js';

export function fieldToSchema(name: string, field: FieldType) {
	if (field.type === 'string') {
		return Ok(`string('${name}')`);
	}
	if (field.type === 'integer') {
		return Ok(`number('${name}')`);
	}
	if (field.type === 'json') {
		return jsonFieldToSchema(name, field);
	}

	/* eslint-disable @typescript-eslint/no-unused-vars */
	// Will type-error if new fields are unhandled
	const exhaustiveCheck: never = field;

	return Err(
		'field-type-not-found',
		new Error(`Field type not found for field "${name}".`),
	);
}

function jsonFieldToSchema(name: string, field: JsonField) {
	return Ok(
		`/** @type {ReturnType<typeof custom<'${name}', ${field.jsDocType}>>} */(custom('${name}'))`,
	);
}
