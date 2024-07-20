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

	config.kit.alias['thing:data'] = './.collections/collections/';

	if (!config.kit.typescript) {
		config.kit.typescript = {};
	}

	const __config = config.kit.typescript.config;
	config.kit.typescript.config = (config) => {
		__config?.(config);

		config.include.push('../.collections/**/*.js', '../.collections/**/*.ts');
	};

	return config;
}
