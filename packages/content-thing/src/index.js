import fs from 'node:fs';
import path from 'node:path';
import { thing } from './state/state.js';

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
	let outputDir;

	return {
		name: 'vite-plugin-content',
		configResolved(_config) {
			config = _config;

			const root = _config.root || process.cwd();
			const collectionsDir = path.join(root, 'src/thing/collections');

			outputDir = path.join(root, '.svelte-kit/content-thing');
			const dbPath = path.join(outputDir, 'sqlite.db');
			const generatedDir = path.join(outputDir, 'generated');
			const collectionsOutput = path.join(generatedDir, 'collections');
			const dbClientPath = path.join(generatedDir, 'db.js');
			const schemaPath = path.join(generatedDir, 'schema.js');

			thing.dispatch('configure', {
				collectionsDir,
				collectionsOutput,
				dbClientPath,
				dbPath,
				generatedDir,
				outputDir,
				root,
				schemaPath,
			});
		},
		configureServer(vite) {
			vite.watcher.on('all', (event, filepath) => {
				thing.dispatch('build', { event, filepath });
			});
		},
		async buildStart() {
			if (config.command === 'build') {
				thing.dispatch('build');
			} else {
				thing.dispatch('watch');
			}
		},
		resolveId(id) {
			if (id.endsWith('sqlite.db')) {
				return id;
			}
		},
		load(id) {
			if (!id.endsWith('sqlite.db')) return;
			if (config.command !== 'build') return;

			const dbPath = path.join(outputDir, 'sqlite.db');
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
 * @typedef {import('./types.js').TocEntry} TocEntry
 */
