import {
	createTableFromSchema,
	deleteFromTable,
	insertIntoTable,
} from '../db/io.js';
import {
	getMarkdownCollectionEntries,
	getYamlCollectionEntries,
} from '../collections/collect.js';
import { atomic, compound, parallel } from 'hine';
import { loadCollectionConfig } from '../config/load.js';
import { mkdirp, rimraf } from '@content-thing/internal-utils/filesystem';
import {
	writeDBClient,
	writeSchema,
	writeSchemaExports,
	writeValidator,
} from '../collections/write.js';
import chokidar from 'chokidar';
import { createLogger } from 'vite';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { MarkdownEntry } from '../collections/entry/markdown.js';
import { YamlEntry } from '../collections/entry/yaml.js';
import type { CollectionEntry } from '../collections/entry/types.js';
import type {
	AtomicAction,
	CollectionConfig,
	CollectionContext,
	ThingContext,
} from './types.js';

export const configSchema = z.object({
	collectionsDir: z.string(),
	collectionsOutput: z.string(),
	dbClientPath: z.string(),
	dbPath: z.string(),
	generatedDir: z.string(),
	outputDir: z.string(),
	root: z.string(),
	schemaPath: z.string(),
});

export const thing = compound({
	name: 'thing',
	types: {
		context: {} as ThingContext,
	},
	children: {
		uninitialized: atomic({
			on: {
				configure: { goto: 'beforeBuild', run: ['updateConfig'] },
			},
		}),
		beforeBuild: atomic({
			on: {
				build: { goto: 'build' },
			},
		}),
		build: atomic({
			entry: ['clearGeneratedFiles', 'buildCollections'],
			on: {
				watch: { goto: 'watch' },
			},
		}),
		watch: parallel({
			entry: ['watchCollections', 'watchCollectionsDir'],
			on: {
				addCollection: {
					run: ['addCollection'],
				},
			},
			children: {},
		}),
	},
});

thing.resolve({
	context: {
		// placeholder values shut TypeScript up
		config: {
			collectionsDir: '',
			collectionsOutput: '',
			dbClientPath: '',
			dbPath: '',
			generatedDir: '',
			outputDir: '',
			root: '',
			schemaPath: '',
		},
		collectionNames: new Set(),
		db: new Database(':memory:'),
		logger: createLogger(),
	},
	actions: {
		buildCollections(ownerState) {
			const { context } = ownerState;

			const logger = context.get('logger');
			logger.info('Starting collection build...', { timestamp: true });

			const {
				collectionsDir,
				collectionsOutput,
				dbClientPath,
				dbPath,
				schemaPath,
			} = context.get('config');

			const db = new Database(dbPath);

			const collectionRootDirs: string[] = [];
			const collectionNames = context.get('collectionNames');
			if (fs.existsSync(collectionsDir)) {
				const entries = fs.readdirSync(collectionsDir, {
					withFileTypes: true,
				});
				for (const entry of entries) {
					if (entry.isDirectory()) {
						collectionRootDirs.push(path.join(collectionsDir, entry.name));
						collectionNames.add(entry.name);
					}
				}
			}
			for (const dir of collectionRootDirs) {
				const config = loadCollectionConfig(dir, collectionsOutput);
				let entries: CollectionEntry[] = [];
				if (config.type === 'markdown') {
					entries = getMarkdownCollectionEntries(config);
				} else if (config.type === 'yaml') {
					entries = getYamlCollectionEntries(config);
				}
				writeSchema(config);
				writeValidator(config);
				createTableFromSchema(db, config);
				for (const entry of entries) {
					// TODO: Split `insertIntoTable` into a prepare and runner to
					// reuse the same prepare statement for the whole collection
					const data = entry.getRecord();

					// TODO: Make this a transaction?
					deleteFromTable(db, config, { _id: data._id });
					insertIntoTable(db, config, data);
				}
			}

			writeSchemaExports(schemaPath, collectionNames);
			writeDBClient(dbClientPath, collectionNames);
			context.update('collectionNames', collectionNames);
		},
		clearGeneratedFiles({ context }) {
			const { dbPath, generatedDir } = context.get('config');

			rimraf(generatedDir);
			mkdirp(generatedDir);
			context.update('db', new Database(dbPath));
		},
		updateConfig({ context, event }) {
			const { value } = (event || {}) as {
				value: z.infer<typeof configSchema>;
			};
			context.update('config', value);
		},
	},
	children: {
		build: {
			conditions: {
				isCollectionItem({ context, event }) {
					const { collectionsDir } = context.get('config');
					const { filepath } = (event?.value || {}) as { filepath: string };
					return filepath.startsWith(collectionsDir);
				},
			},
		},
		watch: {
			actions: {
				addCollection({ context, event }) {
					const { filepath } = event.value as { filepath: string };
					const collectionNames = context.get('collectionNames');
					const collection = path.basename(filepath);
					collectionNames.add(collection);

					const { dbClientPath, schemaPath } = context.get('config');
					writeSchemaExports(schemaPath, collectionNames);
					writeDBClient(dbClientPath, collectionNames);
				},
				watchCollectionsDir(ownerState) {
					const { context } = ownerState;
					const { collectionsDir, root } = context.get('config');
					const logger = context.get('logger');
					logger.info(
						`Watching top-level files in '${collectionsDir.slice(
							root.length + 1,
						)}'`,
						{ timestamp: true },
					);
					const watcher = chokidar.watch(collectionsDir, {
						depth: 0,
						ignoreInitial: true,
					});
					watcher.on('addDir', (filepath) => {
						if (filepath === collectionsDir) return;
						ownerState.dispatch('addCollection', { filepath });
					});
				},
				watchCollections(ownerState) {
					queueMicrotask(() => {
						const { context } = ownerState;
						const { collectionsDir, collectionsOutput, root } =
							context.get('config');
						const collectionNames = context.get('collectionNames');
						const logger = context.get('logger');

						for (const collection of collectionNames) {
							const collectionRoot = path.join(collectionsDir, collection);
							logger.info(
								`Watching collection files in '${collectionRoot.slice(
									root.length + 1,
								)}'`,
								{ timestamp: true },
							);

							ownerState.append(
								{
									[collection]: atomic({
										types: {
											context: {} as CollectionContext,
										},
										entry: { run: ['createWatcher'] },
										on: {
											fileAdded: { run: ['updateFile'] },
											fileChanged: { run: ['updateFile'] },
										},
									}),
								},
								{
									[collection]: {
										context: {
											collectionConfig: loadCollectionConfig(
												collectionRoot,
												collectionsOutput,
											),
											watcher: chokidar.watch(collectionRoot, {
												ignoreInitial: true,
											}),
										},
										conditions: {
											isConfigFile({ event }) {
												return (
													event.value as { filepath: string }
												).filepath.endsWith('/collection.config.json');
											},
										},
										actions: {
											createWatcher,
											updateFile,
										},
									},
								},
							);
						}
					});
				},
			},
		},
	},
});

const createWatcher: AtomicAction<
	CollectionConfig,
	typeof thing,
	'thing.watch'
> = (state) => {
	const { context } = state;
	const watcher = context.get('watcher');
	const logger = context.get('logger');
	const { root } = context.get('config');

	watcher.on('add', (filepath) => {
		logger.info(`File added '${filepath.slice(root.length + 1)}'`, {
			timestamp: true,
		});
		state.dispatch('fileAdded', { filepath });
	});

	watcher.on('change', (filepath) => {
		logger.info(`File changed '${filepath.slice(root.length + 1)}'`, {
			timestamp: true,
		});
		state.dispatch('fileChanged', { filepath });
	});
};

const updateFile: AtomicAction<
	CollectionConfig,
	typeof thing,
	'thing.watch'
> = ({ context, event }) => {
	const config = context.get('collectionConfig');
	const db = context.get('db');
	const logger = context.get('logger');

	const { filepath } = event.value as { name: string; filepath: string };

	// Ignore possibly malformed files being edited actively
	try {
		if (config.type === 'markdown') {
			if (filepath.endsWith('readme.md')) {
				const entry = new MarkdownEntry(filepath);
				const data = entry.getRecord();
				// TODO: Make this a transaction?
				// Delete to avoid conflicts on unique columns
				deleteFromTable(db, config, { _id: data._id });
				insertIntoTable(db, config, data);
			}
			// TODO: else get dependent readmes and update them
		} else if (config.type === 'yaml') {
			if (filepath.endsWith('data.yaml')) {
				const entry = new YamlEntry(filepath);
				const data = entry.getRecord();
				// TODO: Make this a transaction?
				// Delete to avoid conflicts on unique columns
				deleteFromTable(db, config, { _id: data._id });
				insertIntoTable(db, config, data);
			}
		}
	} catch (error) {
		logger.error(
			`[content-thing] Malformed document at ${filepath}. ${error}`,
			{ timestamp: true },
		);
	}
};
