import {
	createTableFromSchema,
	deleteFromTable,
	insertIntoTable,
} from '../db/io.js';
import {
	getMarkdownCollectionEntries,
	getYamlCollectionEntries,
} from '../collections/collect.js';
import { handler, state } from 'hine';
import { loadCollectionConfig } from '../config/load.js';
import { mkdirp, rimraf } from '@content-thing/internal-utils/filesystem';
import {
	writeDBClient,
	writeSchema,
	writeSchemaExports,
	writeValidator,
} from '../collections/write.js';
import chokidar from 'chokidar';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { MarkdownEntry } from '../collections/entry/markdown.js';
import { YamlEntry } from '../collections/entry/yaml.js';

const configSchema = z.object({
	collectionsDir: z.string(),
	collectionsOutput: z.string(),
	dbClientPath: z.string(),
	dbPath: z.string(),
	generatedDir: z.string(),
	outputDir: z.string(),
	root: z.string(),
	schemaPath: z.string(),
});

export const thing = state({
	name: 'thing',
	context: {
		config: configSchema.parse,
		controller: (x) => /** @type {AbortController} */ (x),
		collectionNames: (x) => /** @type {Set<string>} */ (x),
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
				watch: [handler({ goto: 'watch' })],
			},
		}),
		build: state({
			entry: [handler({ run: ['clearGeneratedFiles'] })],
			exit: [handler({ run: ['terminateBuild'] })],
			on: {
				build: [handler({ if: 'isCollectionItem', goto: 'build' })],
			},
		}),
		watch: state({
			context: {
				collections: (x) =>
					/** @type {Record<string, import('hine').StateNode>} */ (x),
			},
			children: {
				initializing: state({
					entry: [
						handler({
							run: ['clearGeneratedFiles'],
						}),
					],
					on: {
						buildDone: [handler({ goto: 'watching' })],
					},
				}),
				watching: state({
					entry: [
						handler({
							run: ['watchCollections', 'watchCollectionsDir'],
						}),
					],
					on: {
						addCollection: [
							handler({
								run: ['addCollection'],
							}),
						],
					},
				}),
			},
		}),
	},
});

thing.resolve({
	context: {
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
		controller: new AbortController(),
		collectionNames: new Set(),
	},
	actions: {
		clearGeneratedFiles({ ownerState }) {
			const { context } = ownerState;
			const { generatedDir } = context.get('config');

			rimraf(generatedDir);
			mkdirp(generatedDir);
		},
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
				terminateBuild({ ownerState }) {
					const { context } = ownerState;
					const controller = context.get('controller');
					controller.abort();
				},
			},
		},
		watch: {
			actions: {
				addCollection({ ownerState, event }) {
					const { context } = ownerState;
					const { filepath } = /** @type {{ filepath: string; }} */ (
						event?.value
					);
					const collectionNames = context.get('collectionNames');
					const collection = path.basename(filepath);
					collectionNames.add(collection);

					const { dbClientPath, schemaPath } = context.get('config');
					writeSchemaExports(schemaPath, collectionNames);
					writeDBClient(dbClientPath, collectionNames);
				},
				watchCollectionsDir({ ownerState }) {
					const { context } = ownerState;
					const { collectionsDir } = context.get('config');
					const watcher = chokidar.watch(collectionsDir, {
						depth: 0,
						ignoreInitial: true,
					});
					watcher.on('addDir', (filepath) => {
						if (filepath === collectionsDir) return;
						ownerState.dispatch('addCollection', { filepath });
					});
				},
				watchCollections({ ownerState }) {
					const { context } = ownerState;
					const { collectionsDir, collectionsOutput, dbPath } =
						context.get('config');
					const collectionNames = context.get('collectionNames');

					const db = new Database(dbPath);
					db.pragma('journal_mode = WAL');

					/** @type {Record<string, import('hine').StateNode>} */
					const collectionStates = {};
					for (const collection of collectionNames) {
						const collectionRoot = path.join(collectionsDir, collection);
						collectionStates[collection] = createCollectionState(
							collectionRoot,
							db,
							collectionsOutput,
						);
					}
				},
			},
			children: {
				initializing: {},
				watching: {},
			},
		},
	},
});

thing.subscribe((thing) => {
	if (
		!thing.matches('thing.build') &&
		!thing.matches('thing.watch.initializing')
	) {
		return;
	}
	const { context } = thing;
	const {
		collectionsDir,
		collectionsOutput,
		dbClientPath,
		dbPath,
		schemaPath,
	} = context.get('config');

	const db = new Database(dbPath);
	db.pragma('journal_mode = WAL');

	const controller = new AbortController();
	const { signal } = controller;
	context.update('controller', controller);

	/** @type {string[]} */
	const collectionRootDirs = [];
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
		if (signal.aborted) return;
		const config = loadCollectionConfig(dir, collectionsOutput);
		/** @type {import('../collections/entry/types.js').CollectionEntry[]} */
		let entries = [];
		if (config.type === 'markdown') {
			entries = getMarkdownCollectionEntries(config);
		} else if (config.type === 'yaml') {
			entries = getYamlCollectionEntries(config);
		}
		writeSchema(config);
		writeValidator(config);
		createTableFromSchema(db, config);
		for (const entry of entries) {
			if (signal.aborted) return;
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
	thing.dispatch('buildDone');
});

/**
 * @param {string} collectionDir
 * @param {import('better-sqlite3').Database} db
 * @param {string} collectionsOutput
 */
function createCollectionState(collectionDir, db, collectionsOutput) {
	const collectionState = state({
		context: {
			watcher: (x) => /** @type {import('chokidar').FSWatcher} */ (x),
			config: (x) => /** @type {ReturnType<typeof loadCollectionConfig>} */ (x),
		},
		entry: [handler({ run: ['createWatcher'] })],
		on: {
			fileAdded: [handler({ run: ['updateFile'] })],
			fileChanged: [handler({ run: ['updateFile'] })],
		},
	});
	collectionState.resolve({
		context: {
			config: loadCollectionConfig(collectionDir, collectionsOutput),
			watcher: chokidar.watch(collectionDir, { ignoreInitial: true }),
		},
		conditions: {
			isConfigFile({ event }) {
				return /** @type {{ filepath: string }} */ (
					event?.value
				).filepath.endsWith('/collection.config.json');
			},
		},
		actions: {
			updateFile({ ownerState, event }) {
				const { context } = ownerState;
				const config = context.get('config');
				const { filepath } = /** @type {{ filepath: string; }} */ (
					event?.value
				);

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
			},
			createWatcher({ ownerState }) {
				const { context } = ownerState;
				const watcher = context.get('watcher');

				watcher.on('add', (filepath) =>
					ownerState.dispatch('fileAdded', {
						filepath,
					}),
				);
				watcher.on('change', (filepath) =>
					ownerState.dispatch('fileChanged', {
						filepath,
					}),
				);
			},
		},
	});
	return collectionState;
}
