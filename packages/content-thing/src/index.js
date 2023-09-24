import {
	getMarkdownCollectionEntries,
	getYamlCollectionInputs,
	getCollections,
} from './collections/collect.js';
import { mkdirp, rimraf } from '@content-thing/internal-utils/filesystem';
import {
	writeMarkdownSchema,
	writeYamlSchema,
	writeDBClient,
	writeSchemaExporter,
	writeValidator,
} from './collections/write.js';
import { createTableFromSchema } from './db/io.js';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import { loadCollectionConfig } from './config/load.js';
import path from 'node:path';

export { extendSvelteConfig } from './svelte-kit.js';

/**
 * A Vite plugin to handle static content
 *
 * @returns {import('vite').Plugin}
 */
export function content() {
	/** @type {import('vite').ResolvedConfig} */
	let config;
	/** @type {string} */
	let collectionsDir;
	/** @type {string} */
	let root = process.cwd();
	/** @type {string} */
	let outputDir;

	return {
		name: 'vite-plugin-content',
		configResolved(_config) {
			if (_config.root) {
				root = _config.root;
			}
			config = _config;
			collectionsDir = path.join(root, 'src/thing/collections');
			outputDir = path.join(root, '.svelte-kit/content-thing/generated');
		},
		configureServer(vite) {
			vite.watcher.on('all', (_event, filepath) => {
				if (filepath.startsWith(collectionsDir)) {
					outputCollections(collectionsDir, outputDir);
				}
			});
		},
		async buildStart() {
			await outputCollections(collectionsDir, outputDir);
		},
		resolveId(id) {
			if (id.endsWith('sqlite.db')) {
				return id;
			}
		},
		load(id) {
			if (!id.endsWith('sqlite.db')) return;
			const dbPath = path.join(outputDir, 'sqlite.db');
			if (config.command === 'serve') {
				return `export default ${JSON.stringify(dbPath)}`;
			}
			const referenceId = this.emitFile({
				type: 'asset',
				name: 'sqlite.db',
				source: fs.readFileSync(dbPath),
			});
			return `export default import.meta.ROLLUP_FILE_URL_${referenceId};\n`;
		},
	};
}

/**
 * @param {string} input The parent directory of collections
 * @param {string} output The output directory of generated content
 */
async function outputCollections(input, output) {
	rimraf(output);
	mkdirp(output);

	const dbPath = path.join(output, 'sqlite.db');
	const db = new Database(dbPath);
	const collectionOutput = path.join(output, 'collections');
	const collections = getCollections(input, collectionOutput);
	/** @type {import('./collections/entry/types.js').CollectionEntry[]} */
	const collectionEntries = [];
	for (const collection of collections) {
		const config = loadCollectionConfig(collection.input);
		if (config.type === 'markdown') {
			const markdownEntries = getMarkdownCollectionEntries(collection, input);
			collectionEntries.push(...markdownEntries);
			writeMarkdownSchema(config, collection);
			writeValidator(collection.name, collection.output);
		} else if (config.type === 'yaml') {
			const yamlEntries = getYamlCollectionInputs(collection, input);
			collectionEntries.push(...yamlEntries);
			writeYamlSchema(config, collection);
			writeValidator(collection.name, collection.output);
		}
		createTableFromSchema(db, config, collection.name);
	}

	const schemaPath = path.join(output, 'schema.js');
	const collectionNames = collections.map((entry) => entry.name);

	writeSchemaExporter(schemaPath, collectionNames);
	writeDBClient(path.join(output, 'db.js'), collectionNames);
}

/**
 * @typedef {import('./types.js').TocEntry} TocEntry
 */
