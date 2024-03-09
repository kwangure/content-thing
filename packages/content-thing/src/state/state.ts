import { match } from 'lil-match';
import {
	createTableFromSchema,
	deleteFromTable,
	dropTable,
	insertIntoTable,
} from '../db/io.js';
import { getCollectionEntries, isReadme } from '../collections/collect.js';
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
import { createLogger, type LogErrorOptions, type LogOptions } from 'vite';
import Database, { type Database as DB } from '@signalapp/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { MarkdownEntry } from '../collections/entry/markdown.js';
import { YamlEntry } from '../collections/entry/yaml.js';

export let logger = createLogger();

export interface ThingConfig {
	collectionsDir: string;
	collectionsOutput: string;
	outputDir: string;
	root: string;
	watch: boolean;
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
				always: {
					if: 'shouldWatch',
					goto: 'watch',
				},
			}),
			watch: atomic({
				entry: ['watchCollections', 'watchCollectionsDir'],
				on: {
					addCollection: { run: ['addCollection'] },
					collectionFound: { run: ['createWatcher'] },
					fileAdded: [
						{ if: 'isCollectionConfig', run: ['seedCollection'] },
						{ if: 'isNotCollectionConfig', run: ['updateFile'] },
					],
					fileChanged: [
						{ if: 'isCollectionConfig', run: ['seedCollection'] },
						{ if: 'isNotCollectionConfig', run: ['updateFile'] },
					],
				},
			}),
		},
	});

	thing.resolve({
		children: {
			build: {
				actions: {
					buildCollections() {
						logInfo('Starting collection build...');
						const dbPath = path.join(thingConfig.outputDir, 'sqlite.db');
						db = new Database(dbPath);
						const { collectionsDir } = thingConfig;
						const collectionRootDirs: string[] = [];
						if (fs.existsSync(collectionsDir)) {
							const entries = fs.readdirSync(collectionsDir, {
								withFileTypes: true,
							});
							for (const entry of entries) {
								if (entry.isDirectory()) {
									collectionRootDirs.push(entry.name);
									collectionNames.add(entry.name);
								}
							}
						}
						for (const collectionName of collectionNames) {
							seedCollection(thingConfig, collectionName, db);
						}

						writeSchemaExports(thingConfig, collectionNames);
						writeDBClient(thingConfig, collectionNames);
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
					shouldWatch: () => thingConfig.watch,
				},
			},
			watch: {
				actions: {
					addCollection({ event }) {
						const { filepath } = event.value as { filepath: string };
						const collection = path.basename(filepath);
						collectionNames.add(collection);

						writeSchemaExports(thingConfig, collectionNames);
						writeDBClient(thingConfig, collectionNames);
					},
					watchCollectionsDir(ownerState) {
						const { collectionsDir, root } = thingConfig;
						logInfo(
							`Watching top-level files in '${collectionsDir.slice(
								root.length + 1,
							)}'`,
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
								logInfo(
									`Watching collection files in '${collectionRoot.slice(
										root.length + 1,
									)}'`,
								);
								ownerState.dispatch('collectionFound', collection);
							}
						});
					},
					createWatcher(ownerState) {
						const { event } = ownerState;
						const { collectionsDir, root } = thingConfig;
						const collectionRoot = path.join(
							collectionsDir,
							event.value as string,
						);
						const watcher = chokidar.watch(collectionRoot, {
							ignoreInitial: true,
						});

						watcher.on('add', (filepath) => {
							ownerState.dispatch('fileAdded', {
								collection: event.value,
								filepath,
							});
						});

						watcher.on('change', (filepath) => {
							ownerState.dispatch('fileChanged', {
								collection: event.value,
								filepath,
							});
						});
					},
					updateFile({ event }) {
						const { filepath } = event.value as { filepath: string };
						const filename = path.basename(filepath);
						if (!isReadme(filename)) return;
						const configResult = loadCollectionConfig(
							thingConfig,
							(event.value as { collection: string }).collection,
						);
						const collectionConfig = unwrapCollectionConfigResult(configResult);
						if (!collectionConfig) return;

						// Ignore possibly malformed files being edited actively
						try {
							let entry;
							if (filename.endsWith('.md')) {
								entry = new MarkdownEntry(filepath);
							} else if (filepath.endsWith('.yaml')) {
								entry = new YamlEntry(filepath);
							}
							if (entry) {
								const data = entry.getRecord();
								// TODO: Make this a transaction?
								// Delete to avoid conflicts on unique columns
								deleteFromTable(db, collectionConfig, { _id: data._id });
								insertIntoTable(db, collectionConfig, data);
							}
						} catch (error) {
							logError(
								`[content-thing] Malformed document at ${filepath}. ${error}`,
							);
						}
					},
					seedCollection({ event }) {
						const { root } = thingConfig;
						const { collection: collectionName, filepath } = event.value as {
							collection: string;
							filepath: string;
						};
						logInfo(
							`Config file ${
								event.name === 'fileAdded' ? 'added' : 'changed'
							} '${filepath.slice(
								root.length + 1,
							)}'. Seeding "${collectionName}" database table.`,
						);
						seedCollection(thingConfig, collectionName, db);
					},
				},
				conditions: {
					isCollectionConfig({ event }) {
						const { filepath } = (event?.value || {}) as { filepath: string };
						return filepath.endsWith('collection.config.json');
					},
					isNotCollectionConfig({ event }) {
						const { filepath } = (event?.value || {}) as { filepath: string };
						return !filepath.endsWith('collection.config.json');
					},
				},
			},
		},
	});

	return thing;
}

function isNonNullable<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

function seedCollection(
	thingConfig: ThingConfig,
	collectionName: string,
	db: DB,
) {
	const configResult = loadCollectionConfig(thingConfig, collectionName);
	const collectionConfig = unwrapCollectionConfigResult(configResult);
	if (!collectionConfig) return;

	writeSchema(thingConfig, collectionConfig);
	writeValidator(thingConfig, collectionConfig);

	dropTable(db, collectionConfig);
	createTableFromSchema(db, collectionConfig);
	const entries = getCollectionEntries(thingConfig, collectionConfig)
		.map((entry) => {
			if (entry.endsWith('.md')) return new MarkdownEntry(entry);
			if (entry.endsWith('.yaml')) return new YamlEntry(entry);
		})
		.filter(isNonNullable);
	for (const entry of entries) {
		// TODO: Split `insertIntoTable` into a prepare and runner to
		// reuse the same prepare statement for the whole collection
		const data = entry.getRecord();

		// TODO: Make this a transaction?
		deleteFromTable(db, collectionConfig, { _id: data._id });
		insertIntoTable(db, collectionConfig, data);
	}
}

function unwrapCollectionConfigResult(
	configResult: ReturnType<typeof loadCollectionConfig>,
) {
	return match(configResult)
		.with({ ok: true }, ({ value }) => value)
		.with({ type: 'file-not-found' }, ({ error: { collection } }) => {
			logError(
				`"collection.config.json" not found in "${collection}" collection. All collections must have a config file.`,
			);
		})
		.with({ type: 'read-file-error' }, ({ error: { collection, message } }) => {
			logError(
				`Unable to read "collections/${collection}/collection.config.json". ${message}`,
			);
		})
		.with({ type: 'json-parse-error' }, ({ error: { collection } }) => {
			logError(
				`Malformed JSON in "collections/${collection}/collection.config.json".`,
			);
		})
		.with({ type: 'validation-error' }, ({ error }) => {
			logError(`Invalid JSON Schema. ${error.format()}`);
		})
		.exhaustive('');
}

function logInfo(message: string, options: LogOptions = {}) {
	if (!('timestamp' in options)) {
		options.timestamp = true;
	}
	logger.info(message, options);
}

function logError(message: string, options: LogErrorOptions = {}) {
	if (!('timestamp' in options)) {
		options.timestamp = true;
	}
	logger.error(message, options);
}
