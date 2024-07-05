import type { ValidatedContentThingConfig } from '../config/config.js';
import { PluginDriver, type Plugin } from './plugin.js';

interface Logger {
	info(message: string): void;
	warn(message: string): void;
	error(message: string): void;
}

export class AssetGraph {
	#assets = new Map<string, Asset>();
	#dependencyMap = new Map<string, Set<string>>();
	#pendingAssetIds = new Set<string>();
	#pendingAssets = new Map<string, Asset>();
	#config;
	#logger;
	#pluginDriver;

	constructor(
		config: ValidatedContentThingConfig,
		plugins: Plugin[],
		logger: Logger,
	) {
		this.#config = config;
		this.#logger = logger;
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
			this.#pendingAssetIds.add(assetId);
		}
	}
	async #generateAssetGraph() {
		while (this.#pendingAssetIds.size > 0) {
			const loadPromises = [];
			for (const assetId of this.#pendingAssetIds) {
				const loadPromise = async () => {
					this.#pendingAssetIds.delete(assetId);
					const loadResult = await this.#pluginDriver.loadId(assetId);
					if (!loadResult) {
						this.#logger.error(`Unable to load id '${assetId}'`);
						return;
					}
					this.#pendingAssets.set(
						assetId,
						new Asset(assetId, loadResult.value),
					);
				};
				loadPromises.push(loadPromise());
			}
			await Promise.all(loadPromises);

			const transformPromises = [];
			for (const asset of this.#pendingAssets.values()) {
				transformPromises.push(this.#pluginDriver.transformAsset(asset));
			}
			await Promise.all(transformPromises);

			const dependencyPromises = [];
			for (const [id, asset] of this.#pendingAssets) {
				const dependencyPromise = async () => {
					const dependenciesResult =
						await this.#pluginDriver.loadDependencies(asset);

					let assetDependencies = this.#dependencyMap.get(id);
					if (!assetDependencies) {
						assetDependencies = new Set();
						this.#dependencyMap.set(id, assetDependencies);
					}

					if (dependenciesResult) {
						for (const dependency of dependenciesResult) {
							if (
								!this.#assets.has(dependency) &&
								!this.#pendingAssets.has(dependency)
							) {
								this.#pendingAssetIds.add(dependency);
							}
							assetDependencies.add(dependency);
						}
					}

					this.#assets.set(id, asset);
					this.#pendingAssets.delete(id);
				};
				dependencyPromises.push(dependencyPromise());
			}
			await Promise.all(dependencyPromises);
		}
	}
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
	set value(value) {
		this.#value = value;
	}
}
