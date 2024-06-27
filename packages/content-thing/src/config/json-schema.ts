import { collectionConfig } from './load.js';
import path from 'node:path';
import { write } from '@content-thing/internal-utils/filesystem';
import { zodToJsonSchema } from 'zod-to-json-schema';

const output = path.join(process.cwd(), 'config/schema.json');
const jsonSchema = zodToJsonSchema(collectionConfig);
write(output, JSON.stringify(jsonSchema, null, 4));
