import {
	parseContentThingOptions,
	type ContentThingOptions,
} from './config.js';
import type { Plugin } from 'vite';

/**
 * A Vite plugin to handle static content
 */
export function collection(options?: ContentThingOptions): Plugin {
	return {
		name: 'vite-plugin-content-thing',
		configResolved(viteConfig) {
			parseContentThingOptions(options, {
				rootDir: viteConfig.root,
			});
		},
	};
}
