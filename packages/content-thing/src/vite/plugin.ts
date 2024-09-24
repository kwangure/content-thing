import {
	parseContentThingOptions,
	type ContentThingOptions,
	type ValidatedContentThingOptions,
} from '../config/options.js';
import { AssetGraph } from '../core/graph.js';
import type { LogErrorOptions, LogOptions, Plugin } from 'vite';
import {
	collectionConfigPlugin,
	markdownPlugin,
	yamlPlugin,
} from '../plugins/node.js';
import { cwd } from 'node:process';
import { createLogger } from 'vite';

/**
 * A Vite plugin to handle static content
 */
export function content(options?: ContentThingOptions): Plugin {
	let assetGraph: AssetGraph;
	let validatedConfig: ValidatedContentThingOptions;
	return {
		name: 'vite-plugin-content-thing',
		async config() {
			/**
			 * Ideally, we should be running in `configResolved` when the
			 * `import('vite').ResolvedConfig['root']` directory is known to
			 * exist but SvelteKit doesn't. It inits in the `config()` hook and
			 * assumes `ResolvedConfig['root']` is `process.cwd()`...so we do
			 * that too.
			 *
			 * We need to run before SvelteKit so that we can emit the `+page.svelte`
			 * files before it starts collecting them
			 */
			validatedConfig = parseContentThingOptions(options, {
				rootDir: cwd(),
			});
			const patchOptions = (options?: LogOptions) => {
				if (!options) options = {};
				if (!('timestamp' in options)) {
					options.timestamp = true;
				}
				return options;
			};
			const viteLogger = createLogger();
			const { error, info, warn } = viteLogger;
			const logger = Object.assign(viteLogger, {
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
				[collectionConfigPlugin, markdownPlugin, yamlPlugin],
				logger,
			);
			await assetGraph.bundle();

			return {
				server: {
					fs: {
						allow: ['./.collections/'],
					},
				},
			};
		},
		configureServer(server) {
			server.watcher.on('all', async (_, path) => {
				if (path.startsWith(validatedConfig.files.collectionsDir)) {
					await assetGraph.reset();
					await assetGraph.bundle();
				}
			});
		},
	};
}
