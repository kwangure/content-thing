import type { Config } from '@sveltejs/kit';

/**
 * Adds 'thing:data' and 'thing:schema' keys to the alias object inside the kit object of a given Config.
 *
 * @param config - The configuration object to update.
 */
export function extendSvelteConfig(config: Config) {
	if (!config.kit) {
		config.kit = {};
	}

	if (!config.kit.alias) {
		config.kit.alias = {};
	}

	config.kit.alias['thing:data'] =
		'./.svelte-kit/content-thing/generated/db.js';
	config.kit.alias['thing:schema'] =
		'./.svelte-kit/content-thing/generated/schema.js';

	if (!config.kit.typescript) {
		config.kit.typescript = {};
	}

	const __config = config.kit.typescript.config;
	config.kit.typescript.config = (config) => {
		__config?.(config);

		// TypeScript requires relative URLs is baseUrl is not provided
		const pathEntries: string[][] = Object.values(config.compilerOptions.paths);
		for (const entries of pathEntries) {
			for (let i = 0; i < entries.length; i++) {
				const entry = entries[i];
				if (entry.startsWith('content-thing')) {
					entries[i] = `./${entry}`;
				}
			}
		}

		config.include.push('./content-thing/**/*.js', './content-thing/**/*.ts');
	};

	return config;
}
