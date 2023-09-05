import {
	getMarkdownCollectionInputs,
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
	let contentDir;
	/** @type {string} */
	let root = process.cwd();
	/** @type {string} */
	let outputDir;
	/** @type {string} */
	let sqliteBinaryPath;

	return {
		name: 'vite-plugin-content',
		configResolved(_config) {
			if (_config.root) {
				root = _config.root;
			}
			config = _config;
			contentDir = path.join(root, 'src/thing/collections');
			outputDir = path.join(root, '.svelte-kit/content-thing/generated');
		},
		configureServer(vite) {
			vite.watcher.on('all', (_event, filepath) => {
				if (filepath.startsWith(contentDir)) {
					outputCollections(contentDir, outputDir);
				}
			});
		},
		async buildStart() {
			await outputCollections(contentDir, outputDir);
		},
		resolveId(id) {
			if (id.endsWith('sqlite.db')) {
				return id;
			}
		},
		load(id) {
			if (id.endsWith('sqlite.db')) {
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
			}
			if (id.endsWith('better_sqlite3.node')) {
				if (config.command === 'serve') {
					sqliteBinaryPath = id;
					return `export default ${JSON.stringify(id)}`;
				}
				const referenceId = this.emitFile({
					type: 'asset',
					name: 'better_sqlite3.node',
					source: fs.readFileSync(id),
				});
				sqliteBinaryPath = `import.meta.ROLLUP_FILE_URL_${referenceId}`;
				return `export default import.meta.ROLLUP_FILE_URL_${referenceId};\n`;
			}
		},
		transform(code, id) {
			if (!id.endsWith('better-sqlite3/lib/database.js')) return;

			const lines = code.split('\n');

			let insertCreateRequireIndex = -1;
			let replaceAddonRequireIndex = -1;
			let compareNativeBindingPathIndex = -1;

			for (let i = 0; i < lines.length; i++) {
				if (insertCreateRequireIndex === -1 && lines[i].startsWith('const')) {
					insertCreateRequireIndex = i;
				}

				if (
					compareNativeBindingPathIndex === -1 &&
					lines[i].includes('nativeBindingPath == null')
				) {
					compareNativeBindingPathIndex = i;
				}

				if (
					replaceAddonRequireIndex === -1 &&
					lines[i].includes('addon = require(')
				) {
					replaceAddonRequireIndex = i;
				}
			}

			if (compareNativeBindingPathIndex !== -1) {
				// Removing this if branch allows the require of `bindings` to be tree-shaken
				lines[compareNativeBindingPathIndex] = lines[
					compareNativeBindingPathIndex
				].replace('nativeBindingPath == null', 'false');
			}

			if (replaceAddonRequireIndex !== -1) {
				// Vite prepends with `file://` in production;
				const replacedRequire = `		addon = require2(${sqliteBinaryPath}.replace(/^[a-zA-Z]+:\\/\\//, ''));`;
				lines[replaceAddonRequireIndex] = replacedRequire;
			}

			if (insertCreateRequireIndex !== -1) {
				lines.splice(
					insertCreateRequireIndex,
					0,
					"	const { createRequire } = require('module');\n	const require2 = createRequire(import.meta.url);",
				);
			}

			// Joining modified lines back to a single string
			return lines.join('\n');
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
	for (const collection of collections) {
		const config = loadCollectionConfig(collection.input);
		if (config.type === 'markdown') {
			const markdownOptions = getMarkdownCollectionInputs(collection);
			outputMarkdownCollection(
				markdownOptions,
				config,
				collection,
				collectionOutputs,
			);
		} else if (config.type === 'yaml') {
			const yamlOptions = getYamlCollectionInputs(collection);
			outputYamlCollection(yamlOptions, config, collection, collectionOutputs);
		}
	}

	const schemaPath = path.join(output, 'schema.js');
	const dbPath = path.join(output, 'sqlite.db');
	const collectionNames = collections.map((entry) => entry.name);

	writeSchemaExporter(schemaPath, collectionNames);
	writeDBClient(path.join(output, 'db.js'), collectionNames);

	await generateSQLiteDB(schemaPath, path.join(output, 'migrations'));
	await pushSQLiteDB(schemaPath, dbPath);
	await loadSQLiteDB(dbPath, collectionOutput, collectionNames);
}

/**
 * @typedef {import('./types.js').TocEntry} TocEntry
 */
