import {
	drizzleIntegerColumn,
	drizzleTextColumn,
	jsonConfig,
	markdownConfig,
	plaintextConfig,
	yamlConfig,
} from './load.js';
import path from 'node:path';
import { write } from '@content-thing/internal-utils/filesystem';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

const output = path.join(process.cwd(), 'config/schema.json');

const jsonSchemaString = {
	$schema: z.string().optional(),
};

const configSchema = z.discriminatedUnion('type', [
	jsonConfig.extend(jsonSchemaString),
	markdownConfig.extend(jsonSchemaString),
	plaintextConfig.extend(jsonSchemaString),
	yamlConfig.extend(jsonSchemaString),
]);

const jsonSchema = zodToJsonSchema(configSchema, {
	definitions: {
		jsonConfig: jsonConfig,
		markdownConfig: markdownConfig,
		plaintextConfig: plaintextConfig,
		yamlConfig: yamlConfig,
		integerField: drizzleIntegerColumn,
		textField: drizzleTextColumn,
	},
});

write(output, JSON.stringify(jsonSchema, null, 4));
