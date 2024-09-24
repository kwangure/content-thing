import type { Config } from '@sveltejs/kit';

export function extendSvelteConfig(config: Config) {
	if (!config.kit) {
		config.kit = {};
	}

	if (!config.kit.alias) {
		config.kit.alias = {};
	}

	config.kit.alias['$collections'] = './.collections/collections/';
	config.kit.alias['$routes'] = config.kit.files?.routes ?? './src/routes/';

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
