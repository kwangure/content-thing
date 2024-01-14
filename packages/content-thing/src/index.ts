import fs from 'node:fs';
import path from 'node:path';
import { createThing, logger, type ThingConfig } from './state/state.js';
import type { Plugin, ResolvedConfig } from 'vite';

export { createCollection } from './better-sqlite/index.js';
export { extendSvelteConfig } from './svelte-kit.js';

/**
 * A Vite plugin to handle static content
 */
export function content(): Plugin {
	let command: ResolvedConfig['command'];
	let outputDir: string;
	let thingConfig: ThingConfig;

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
			thingConfig = {
				collectionsDir: path.join(config.root, 'src/thing/collections'),
				collectionsOutput: path.join(outputDir, 'collections'),
				root: config.root,
				outputDir,
				watch: command === 'serve',
			};
			const thing = createThing(thingConfig);
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
		async handleHotUpdate(hmrContext) {
			const { file, server, modules } = hmrContext;
			if (!file.startsWith(thingConfig.collectionsDir)) return;

			// HMR update files that import `"thing:data"` and `"thing:schema"`
			// when collection data changes
			const [dataModuleNode, schemaModuleNode] = await Promise.all([
				server.moduleGraph.getModuleByUrl('/.svelte-kit/content-thing/db.js'),
				server.moduleGraph.getModuleByUrl(
					'/.svelte-kit/content-thing/schema.js',
				),
			]);
			return Array.from(
				new Set([
					...modules,
					...(dataModuleNode?.importers ?? []),
					...(schemaModuleNode?.importers ?? []),
				]),
			);
		},
	};
}

export type { TocEntry } from './types.js';
