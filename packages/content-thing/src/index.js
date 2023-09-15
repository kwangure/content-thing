import {
	getMarkdownCollectionEntries,
	getYamlCollectionInputs,
	getCollections,
} from './collections/collect.js';
import { generateSQLiteDB, loadSQLiteDB, pushSQLiteDB } from './db/io.js';
import {
	outputMarkdownCollection,
	outputYamlCollection,
	writeDBClient,
	writeSchemaExporter,
} from './collections/write.js';
import { loadCollectionConfig } from './config/load.js';
import path from 'node:path';
import { rimraf } from '@content-thing/internal-utils/filesystem';
import fs from 'node:fs';

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

	const collectionOutput = path.join(output, 'collections');
	const collections = getCollections(input, collectionOutput);
	/** @type {Record<string, string>} */
	const collectionOutputs = {};
	for (const collection of collections) {
		collectionOutputs[collection.name] = collection.output;
	}
	/** @type {import('./collections/entry/types.js').CollectionEntry[]} */
	const collectionEntries = [];
	for (const collection of collections) {
		const config = loadCollectionConfig(collection.input);
		if (config.type === 'markdown') {
			const markdownOptions = getMarkdownCollectionEntries(
				collection,
				input,
				output,
			);
			outputMarkdownCollection(
				markdownOptions,
				config,
				collection,
				collectionOutputs,
			);
			collectionEntries.push(...markdownOptions);
		} else if (config.type === 'yaml') {
			const yamlOptions = getYamlCollectionInputs(collection, input, output);
			outputYamlCollection(yamlOptions, config, collection, collectionOutputs);
			collectionEntries.push(...yamlOptions);
		}
	}

	const schemaPath = path.join(output, 'schema.js');
	const collectionNames = collections.map((entry) => entry.name);

	writeSchemaExporter(schemaPath, collectionNames);
	writeDBClient(path.join(output, 'db.js'), collectionNames);

	await generateSQLiteDB(schemaPath, path.join(output, 'migrations'));
	await pushSQLiteDB(schemaPath, path.join(output, 'sqlite.db'));
	await loadSQLiteDB(collectionEntries);
}

/**
 * @typedef {import('./types.js').TocEntry} TocEntry
 */
