import {
	parseContentThingOptions,
	type ContentThingOptions,
} from '../config/options.js';
import { AssetGraph } from '../core/graph.js';
import type { Plugin, ResolvedConfig } from 'vite';
import {
	collectionConfigPlugin,
	markdownPlugin,
	yamlPlugin,
} from '../plugins/index.js';
import fs from 'node:fs';
import path from 'node:path';

/**
 * A Vite plugin to handle static content
 */
export function content(options?: ContentThingOptions): Plugin {
	let command: ResolvedConfig['command'];
	let outputDir: string;
	return {
		name: 'vite-plugin-content-thing',
		async configResolved(viteConfig) {
			const validatedConfig = parseContentThingOptions(options, {
				rootDir: viteConfig.root,
			});
			const graph = new AssetGraph(
				validatedConfig,
				[collectionConfigPlugin, markdownPlugin, yamlPlugin],
				viteConfig.logger,
			);
			await graph.bundle();

			command = viteConfig.command;
			outputDir = validatedConfig.files.outputDir;
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
