import {
	parseContentThingOptions,
	type ContentThingOptions,
	type ValidatedContentThingOptions,
} from '../config/options.js';
import { AssetGraph } from '../core/graph.js';
import type { LogErrorOptions, LogOptions, Plugin, ResolvedConfig } from 'vite';
import {
	collectionConfigPlugin,
	markdownPlugin,
	memdbPlugin,
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
	let assetGraph: AssetGraph;
	let validatedConfig: ValidatedContentThingOptions;
	return {
		name: 'vite-plugin-content-thing',
		async configResolved(viteConfig) {
			validatedConfig = parseContentThingOptions(options, {
				rootDir: viteConfig.root,
			});
			const patchOptions = (options?: LogOptions) => {
				if (!options) options = {};
				if (!('timestamp' in options)) {
					options.timestamp = true;
				}
				return options;
			};
			const { error, info, warn } = viteConfig.logger;
			const logger = Object.assign(viteConfig.logger, {
				error(message: string, options?: LogErrorOptions) {
					error(message, patchOptions(options));
				},
				info(message: string, options?: LogOptions) {
					info(message, patchOptions(options));
				},
				warn(message: string, options?: LogOptions) {
					warn(message, patchOptions(options));
				},
			});
			assetGraph = new AssetGraph(
				validatedConfig,
				[collectionConfigPlugin, markdownPlugin, yamlPlugin, memdbPlugin],
				logger,
			);
			await assetGraph.bundle();

			command = viteConfig.command;
			outputDir = validatedConfig.files.outputDir;
		},
		configureServer(server) {
			server.watcher.on('all', async (_, path) => {
				if (path.startsWith(validatedConfig.files.collectionsDir)) {
					await assetGraph.reset();
					await assetGraph.bundle();
				}
			});
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
