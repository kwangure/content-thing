import type { CollectionConfig } from '../config/types.js';
import type { Logger } from 'vite';
import type { ValidatedContentThingOptions } from '../config/options.js';
import { PluginDriver, type Plugin } from './plugin.js';
import fs from 'node:fs';
import path from 'node:path';

interface CollectionConfigMeta {
	config: CollectionConfig;
	items: unknown[];
}

export class AssetGraph {
	#collectionConfigs = new Map<string, CollectionConfigMeta>();
	#options;
	#logger;
	#pluginDriver;

	constructor(
		options: ValidatedContentThingOptions,
		plugins: Plugin[],
		logger: Logger,
	) {
		this.#logger = logger;
		this.#options = options;
		this.#pluginDriver = new PluginDriver(plugins);
	}

	async #loadCollectionConfigs() {
		const { collectionsDir } = this.#options.files;
		if (!fs.existsSync(collectionsDir)) return;

		const dirents = fs.readdirSync(collectionsDir, { withFileTypes: true });
		const configFilepaths = [];
		for (const entry of dirents) {
			if (!entry.isDirectory()) continue;

			const configPath = path.join(
				entry.path,
				entry.name,
				'collection.config.json',
			);
			if (fs.existsSync(configPath)) {
				configFilepaths.push(configPath);
			}
		}

		for (const filepath of configFilepaths) {
			const loadResult =
				await this.#pluginDriver.loadCollectionConfig(filepath);
			if (loadResult.ok) {
				this.#collectionConfigs.set(filepath, {
					config: loadResult.value,
					items: [],
				});
			} else {
				this.#logger.error(loadResult.error.message);
			}
		}
	}

	async #transformCollectionConfigs() {
		for (const { config } of this.#collectionConfigs.values()) {
			const transformResult =
				await this.#pluginDriver.transformCollectionConfig(config);
			if (!transformResult.ok) {
				this.#logger.error(transformResult.error.message);
			}
		}
	}

	async #writeCollectionConfigs() {
		for (const { config } of this.#collectionConfigs.values()) {
			await this.#pluginDriver.writeCollectionConfig({
				config,
				options: this.#options,
			});
		}
	}

	async #loadCollectionItems() {
		for (const configMeta of this.#collectionConfigs.values()) {
			const { config } = configMeta;
			configMeta.items = await this.#pluginDriver.loadCollectionItems({
				config,
				options: this.#options,
			});
		}
	}

	async bundle() {
		this.#pluginDriver.initialize();
		await this.#loadCollectionConfigs();
		await this.#transformCollectionConfigs();
		await this.#writeCollectionConfigs();
		await this.#loadCollectionItems();
	}

	reset() {
		this.#collectionConfigs.clear();
	}
}
