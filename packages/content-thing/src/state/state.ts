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
import { PluginContainer } from '../plugins/index.js';
import { jsonPlugin } from '../plugins/json.js';
import { markdownPlugin } from '../plugins/markdown/plugin.js';
import { yamlPlugin } from '../plugins/yaml.js';
import { plaintextPlugin } from '../plugins/plaintext.js';

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
	const pluginContainer = new PluginContainer([
		jsonPlugin,
		markdownPlugin,
		yamlPlugin,
		plaintextPlugin,
	]);
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
							seedCollection(thingConfig, collectionName, db, pluginContainer);
						}

						writeSchemaExports(thingConfig, collectionNames);
						writeDBClient(thingConfig, collectionNames);
					},
					clearGeneratedFiles() {
						rimraf(thingConfig.collectionsOutput);
						mkdirp(thingConfig.collectionsOutput);
					},
				},
				conditions: {
					isCollectionItem(event) {
						const { filepath } = event.detail as { filepath: string };
						return filepath.startsWith(thingConfig.collectionsDir);
					},
					shouldWatch: () => thingConfig.watch,
				},
			},
			watch: {
				actions: {
					addCollection(event) {
						const { filepath } = event.detail as { filepath: string };
						const collection = path.basename(filepath);
						collectionNames.add(collection);

						writeSchemaExports(thingConfig, collectionNames);
						writeDBClient(thingConfig, collectionNames);
					},
					watchCollectionsDir(event) {
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
							event.currentTarget.dispatch('addCollection', { filepath });
						});
					},
					watchCollections(event) {
						queueMicrotask(() => {
							const { collectionsDir, root } = thingConfig;

							for (const collection of collectionNames) {
								const collectionRoot = path.join(collectionsDir, collection);
								logInfo(
									`Watching collection files in '${collectionRoot.slice(
										root.length + 1,
									)}'`,
								);
								event.currentTarget.dispatch('collectionFound', collection);
							}
						});
					},
					createWatcher(event) {
						const { collectionsDir } = thingConfig;
						const collectionRoot = path.join(
							collectionsDir,
							event.detail as string,
						);
						const watcher = chokidar.watch(collectionRoot, {
							ignoreInitial: true,
						});

						watcher.on('add', (filepath) => {
							event.currentTarget.dispatch('fileAdded', {
								collection: event.detail,
								filepath,
							});
						});

						watcher.on('change', (filepath) => {
							event.currentTarget.dispatch('fileChanged', {
								collection: event.detail,
								filepath,
							});
						});
					},
					async updateFile(event) {
						const { filepath } = event.detail as { filepath: string };
						const filename = path.basename(filepath);
						if (!isReadme(filename)) return;
						const configResult = loadCollectionConfig(
							thingConfig,
							(event.detail as { collection: string }).collection,
						);
						const collectionConfig = unwrapCollectionConfigResult(configResult);
						if (!collectionConfig) return;

						// Ignore possibly malformed files being edited actively
						try {
							const loadResult = await pluginContainer.loadFile(
								filepath,
								collectionConfig.type,
							);
							if (loadResult) {
								// TODO: Make this a transaction?
								// Delete to avoid conflicts on unique columns
								deleteFromTable(db, collectionConfig, {
									_id: loadResult.record._id,
								});
								insertIntoTable(db, collectionConfig, loadResult.record);
							}
						} catch (error) {
							logError(
								`[content-thing] Malformed document at ${filepath}. ${error}`,
							);
						}
					},
					seedCollection(event) {
						const { root } = thingConfig;
						const { collection: collectionName, filepath } = event.detail as {
							collection: string;
							filepath: string;
						};
						logInfo(
							`Config file ${
								event.type === 'fileAdded' ? 'added' : 'changed'
							} '${filepath.slice(
								root.length + 1,
							)}'. Seeding "${collectionName}" database table.`,
						);
						seedCollection(thingConfig, collectionName, db, pluginContainer);
					},
				},
				conditions: {
					isCollectionConfig(event) {
						const { filepath } = event.detail as { filepath: string };
						return filepath.endsWith('collection.config.json');
					},
					isNotCollectionConfig(event) {
						const { filepath } = event.detail as { filepath: string };
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

async function seedCollection(
	thingConfig: ThingConfig,
	collectionName: string,
	db: DB,
	pluginContainer: PluginContainer,
) {
	const configResult = loadCollectionConfig(thingConfig, collectionName);
	const collectionConfig = unwrapCollectionConfigResult(configResult);
	if (!collectionConfig) return;

	writeSchema(thingConfig, collectionConfig);
	writeValidator(thingConfig, collectionConfig);

	dropTable(db, collectionConfig);
	createTableFromSchema(db, collectionConfig);
	const entries = (
		await Promise.all(
			getCollectionEntries(thingConfig, collectionConfig).map((entry) =>
				pluginContainer.loadFile(entry, collectionConfig.type),
			),
		)
	).filter(isNonNullable);
	for (const { record } of entries) {
		// TODO: Split `insertIntoTable` into a prepare and runner to
		// reuse the same prepare statement for the whole collection

		// TODO: Make this a transaction?
		deleteFromTable(db, collectionConfig, { _id: record._id });
		insertIntoTable(db, collectionConfig, record);
	}
}

function unwrapCollectionConfigResult(
	configResult: ReturnType<typeof loadCollectionConfig>,
) {
	if (configResult.ok) {
		return configResult.value;
	}

	if (configResult.type === 'file-not-found') {
		return logError(
			`"collection.config.json" not found in "${configResult.error.collection}" collection. All collections must have a config file.`,
		);
	}

	if (configResult.type === 'read-file-error') {
		return logError(
			`Unable to read "collections/${configResult.error.collection}/collection.config.json". ${configResult.error.message}`,
		);
	}

	if (configResult.type === 'json-parse-error') {
		return logError(
			`Malformed JSON in "collections/${configResult.error.collection}/collection.config.json".`,
		);
	}

	if (configResult.type === 'validation-error') {
		return logError(
			`Invalid JSON Schema. ${JSON.stringify(
				configResult.error.format(),
				null,
				4,
			)}`,
		);
	}

	const exhaustiveCheck: never = configResult.type;
	throw Error(
		`Unhandled config error of type "${exhaustiveCheck}". ${configResult.error}`,
	);
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
