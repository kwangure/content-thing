import type { CollectionConfig } from '../../config/types';

export function stringifyData(record: Record<string, unknown>) {
	const __record = Object.assign({ _content: undefined }, record);
	let code = '// This file is auto-generated. Do not edit directly.\n';
	code += `export const data = JSON.parse(${JSON.stringify(JSON.stringify(__record))});\n`;
	return code;
}

export function stringifyTypes(collectionConfig: CollectionConfig) {
	let code = '// This file is auto-generated. Do not edit directly.\n';
	code += `export type Frontmatter = {\n`;
	const fields = Object.entries(collectionConfig.fields);
	for (const [fieldName, field] of fields) {
		const type = 'typeScriptType' in field ? field.typeScriptType : field.type;
		code += `\t${fieldName}: ${type};\n`;
	}
	code += `};\n`;
	return code;
}
