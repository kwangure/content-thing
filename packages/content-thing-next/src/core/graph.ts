import type { ValidatedContentThingConfig } from '../config/config.js';
import { PluginDriver, type Plugin } from './plugin.js';

export class AssetGraph {
	#assets = new Map<string, Asset>();
	#entryAssetIds = new Set<string>();
	#config;
	#pluginDriver;
	constructor(config: ValidatedContentThingConfig, plugins: Plugin[]) {
		this.#config = config;
		this.#pluginDriver = new PluginDriver(plugins);
	}
	async bundle() {
		this.#pluginDriver.bundle();
		this.#pluginDriver.monitor();
		this.#pluginDriver.configResolved(this.#config);
		await this.#addEntryAssetIds();
		await this.#generateAssetGraph();
	}
	async #addEntryAssetIds() {
		const entryAssetIds = await this.#pluginDriver.addEntryAssetIds();

		for (const assetId of entryAssetIds) {
			this.#entryAssetIds.add(assetId);
		}
	}
	#generateAssetGraph() {}
}

export class Asset {
	#id;
	#value;

	constructor(id: string, value: unknown) {
		this.#id = id;
		this.#value = value;
	}
	get id() {
		return this.#id;
	}
	get value() {
		return this.#value;
	}
}
