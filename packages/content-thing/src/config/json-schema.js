import {
	drizzleIntegerColumn,
	drizzlePrimaryKeyConfig,
	drizzleTextColumn,
	markdownConfig,
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
	markdownConfig.extend(jsonSchemaString),
	yamlConfig.extend(jsonSchemaString),
]);

const jsonSchema = zodToJsonSchema(configSchema, {
	definitions: {
		markdownConfig: markdownConfig,
		yamlConfig: yamlConfig,
		fieldPrimaryKey: drizzlePrimaryKeyConfig,
		integerField: drizzleIntegerColumn,
		textField: drizzleTextColumn,
	},
});

write(output, JSON.stringify(jsonSchema, null, 4));
