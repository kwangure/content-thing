import fs from 'node:fs';
import path from 'node:path';
import { createThing, logger } from './state/state.js';
import type { Plugin, ResolvedConfig } from 'vite';

export { createCollection } from './better-sqlite/index.js';
export { extendSvelteConfig } from './svelte-kit.js';

/**
 * A Vite plugin to handle static content
 */
export function content(): Plugin {
	let command: ResolvedConfig['command'];
	let outputDir: string;

	return {
		name: 'vite-plugin-content',
		config() {
			return {
				customLogger: logger,
			};
		},
		configResolved(config) {
			command = config.command;
			outputDir = path.join(config.root, '.svelte-kit/content-thing');
			const thing = createThing({
				collectionsDir: path.join(config.root, 'src/thing/collections'),
				collectionsOutput: path.join(outputDir, 'collections'),
				root: config.root,
				outputDir,
				watch: command === 'serve',
			});
			thing.dispatch('build');
		},
		resolveId(id) {
			if (id.endsWith('sqlite.db')) {
				return id;
			}
		},
		load(id) {
			if (!id.endsWith('sqlite.db')) return;
			const dbPath = path.join(outputDir, 'sqlite.db');
			if (command === 'serve') {
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

export type { TocEntry } from './types.js';
