import { createTableFromSchema, loadSQLiteDB } from '../db/io.js';
import {
	getCollections,
	getMarkdownCollectionEntries,
	getYamlCollectionInputs,
} from '../collections/collect.js';
import { handler, state } from 'hine';
import { loadCollectionConfig } from '../config/load.js';
import { mkdirp, rimraf } from '@content-thing/internal-utils/filesystem';
import {
	writeDBClient,
	writeMarkdownSchema,
	writeSchemaExporter,
	writeValidator,
	writeYamlSchema,
} from '../collections/write.js';
import Database from 'better-sqlite3';
import path from 'node:path';
import { z } from 'zod';

const configSchema = z.object({
	collectionsDir: z.string(),
	dbPath: z.string(),
	generatedDir: z.string(),
	outputDir: z.string(),
	root: z.string(),
});

export const thing = state({
	context: {
		config: configSchema.parse,
	},
	children: {
		uninitialized: state({
			on: {
				configure: [handler({ goto: 'beforeBuild', run: ['updateConfig'] })],
			},
		}),
		beforeBuild: state({
			on: {
				build: [handler({ goto: 'build' })],
			},
		}),
		build: state({
			entry: [handler({ run: ['runBuild'] })],
			exit: [handler({ run: ['terminateBuild'] })],
			context: {
				controller: (x) => /** @type {AbortController} */ (x),
			},
			on: {
				build: [handler({ if: 'isCollectionItem', goto: 'build' })],
			},
		}),
	},
});

thing.resolve({
	context: {
		config: {
			collectionsDir: '',
			dbPath: '',
			generatedDir: '',
			outputDir: '',
			root: '',
		},
	},
	actions: {
		updateConfig({ ownerState, event }) {
			const { context } = ownerState;
			const { value } = /** @type {{ value: z.infer<typeof configSchema> }} */ (
				event || {}
			);
			context.update('config', value);
		},
	},
	children: {
		build: {
			context: {
				controller: new AbortController(),
			},
			conditions: {
				isCollectionItem({ ownerState, event }) {
					const { context } = ownerState;
					const { collectionsDir } = context.get('config');
					const { filepath } = /** @type {{ filepath: string }} */ (
						event?.value || {}
					);
					return filepath.startsWith(collectionsDir);
				},
			},
			actions: {
				async runBuild({ ownerState }) {
					const { context } = ownerState;
					const { collectionsDir, dbPath, generatedDir } =
						context.get('config');

					rimraf(generatedDir);
					mkdirp(generatedDir);

					const db = new Database(dbPath);
					db.pragma('journal_mode = WAL');

					const controller = new AbortController();
					const { signal } = controller;
					context.update('controller', controller);

					const collectionOutput = path.join(generatedDir, 'collections');
					const collections = getCollections(collectionsDir, collectionOutput);
					/** @type {import('../collections/entry/types.js').CollectionEntry[]} */
					const collectionEntries = [];
					for (const collection of collections) {
						if (signal.aborted) return;
						const config = loadCollectionConfig(collection.input);
						if (config.type === 'markdown') {
							const markdownEntries = getMarkdownCollectionEntries(
								collection,
								collectionsDir,
							);
							collectionEntries.push(...markdownEntries);
							writeMarkdownSchema(config, collection);
							writeValidator(collection.name, collection.output);
						} else if (config.type === 'yaml') {
							const yamlEntries = getYamlCollectionInputs(
								collection,
								collectionsDir,
							);
							collectionEntries.push(...yamlEntries);
							writeYamlSchema(config, collection);
							writeValidator(collection.name, collection.output);
						}
						createTableFromSchema(db, config, collection.name);
					}

					const schemaPath = path.join(generatedDir, 'schema.js');
					const collectionNames = collections.map((entry) => entry.name);

					writeSchemaExporter(schemaPath, collectionNames);
					writeDBClient(path.join(generatedDir, 'db.js'), collectionNames);
					await loadSQLiteDB(db, collectionEntries, signal);
				},
				terminateBuild({ ownerState }) {
					const { context } = ownerState;
					const controller = context.get('controller');
					controller.abort();
				},
			},
		},
	},
});
