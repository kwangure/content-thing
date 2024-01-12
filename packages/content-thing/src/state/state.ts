import {
	createTableFromSchema,
	deleteFromTable,
	insertIntoTable,
} from '../db/io.js';
import {
	getMarkdownCollectionEntries,
	getYamlCollectionEntries,
} from '../collections/collect.js';
import { atomic, compound } from 'hine';
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
import Database, { type Database as DB } from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { MarkdownEntry } from '../collections/entry/markdown.js';
import { YamlEntry } from '../collections/entry/yaml.js';
import type { CollectionEntry } from '../collections/entry/types.js';

export let logger = createLogger();

interface ThingConfig {
	collectionsDir: string;
	collectionsOutput: string;
	dbClientPath: string;
	dbPath: string;
	outputDir: string;
	root: string;
	schemaPath: string;
}

export function createThing(thingConfig: ThingConfig) {
	let db: DB;
	const collectionNames: Set<string> = new Set();
	const thing = compound({
		name: 'thing',
		children: {
			uninitialized: atomic({
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
			watch: atomic({
				entry: ['watchCollections', 'watchCollectionsDir'],
				on: {
					addCollection: { run: ['addCollection'] },
					collectionFound: { run: ['createWatcher'] },
					fileAdded: { run: ['updateFile'] },
					fileChanged: { run: ['updateFile'] },
				},
			}),
		},
	});

	thing.resolve({
		children: {
			build: {
				actions: {
					buildCollections() {
						logger.info('Starting collection build...', { timestamp: true });
						const {
							collectionsDir,
							collectionsOutput,
							dbClientPath,
							dbPath,
							schemaPath,
						} = thingConfig;
						db = new Database(dbPath);
						const collectionRootDirs: string[] = [];
						if (fs.existsSync(collectionsDir)) {
							const entries = fs.readdirSync(collectionsDir, {
								withFileTypes: true,
							});
							for (const entry of entries) {
								if (entry.isDirectory()) {
									collectionRootDirs.push(
										path.join(collectionsDir, entry.name),
									);
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
					},
					clearGeneratedFiles() {
						rimraf(thingConfig.outputDir);
						mkdirp(thingConfig.outputDir);
					},
				},
				conditions: {
					isCollectionItem({ event }) {
						const { filepath } = (event?.value || {}) as { filepath: string };
						return filepath.startsWith(thingConfig.collectionsDir);
					},
				},
			},
			watch: {
				actions: {
					addCollection({ event }) {
						const { filepath } = event.value as { filepath: string };
						const collection = path.basename(filepath);
						collectionNames.add(collection);

						writeSchemaExports(thingConfig.schemaPath, collectionNames);
						writeDBClient(thingConfig.dbClientPath, collectionNames);
					},
					watchCollectionsDir(ownerState) {
						const { collectionsDir, root } = thingConfig;
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
							const { collectionsDir, root } = thingConfig;

							for (const collection of collectionNames) {
								const collectionRoot = path.join(collectionsDir, collection);
								logger.info(
									`Watching collection files in '${collectionRoot.slice(
										root.length + 1,
									)}'`,
									{ timestamp: true },
								);
								ownerState.dispatch('collectionFound', collection);
							}
						});
					},
					createWatcher(ownerState) {
						const { event } = ownerState;
						const collectionRoot = path.join(
							thingConfig.collectionsDir,
							event.value as string,
						);
						const watcher = chokidar.watch(collectionRoot, {
							ignoreInitial: true,
						});

						watcher.on('add', (filepath) => {
							logger.info(
								`File added '${filepath.slice(thingConfig.root.length + 1)}'`,
								{
									timestamp: true,
								},
							);
							ownerState.dispatch('fileAdded', {
								collection: event.value,
								filepath,
							});
						});

						watcher.on('change', (filepath) => {
							logger.info(
								`File changed '${filepath.slice(thingConfig.root.length + 1)}'`,
								{
									timestamp: true,
								},
							);
							ownerState.dispatch('fileChanged', {
								collection: event.value,
								filepath,
							});
						});
					},
					updateFile({ event }) {
						const collectionRoot = path.join(
							thingConfig.collectionsDir,
							(event.value as { collection: string }).collection,
						);
						const collectionConfig = loadCollectionConfig(
							collectionRoot,
							thingConfig.collectionsOutput,
						);

						const { filepath } = event.value as { filepath: string };

						// Ignore possibly malformed files being edited actively
						try {
							if (collectionConfig.type === 'markdown') {
								if (filepath.endsWith('readme.md')) {
									const entry = new MarkdownEntry(filepath);
									const data = entry.getRecord();
									// TODO: Make this a transaction?
									// Delete to avoid conflicts on unique columns
									deleteFromTable(db, collectionConfig, { _id: data._id });
									insertIntoTable(db, collectionConfig, data);
								}
								// TODO: else get dependent readmes and update them
							} else if (collectionConfig.type === 'yaml') {
								if (filepath.endsWith('data.yaml')) {
									const entry = new YamlEntry(filepath);
									const data = entry.getRecord();
									// TODO: Make this a transaction?
									// Delete to avoid conflicts on unique columns
									deleteFromTable(db, collectionConfig, { _id: data._id });
									insertIntoTable(db, collectionConfig, data);
								}
							}
						} catch (error) {
							logger.error(
								`[content-thing] Malformed document at ${filepath}. ${error}`,
								{ timestamp: true },
							);
						}
					},
				},
			},
		},
	});

	return thing;
}
