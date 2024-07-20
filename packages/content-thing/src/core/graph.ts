import type { Logger } from 'vite';
import type { ValidatedContentThingOptions } from '../config/options.js';
import { PluginDriver, type Plugin } from './plugin.js';

export class AssetGraph {
	#assets = new Map<string, Asset>();
	#bundles = new Map<string, Bundle>();
	#dependencyMap = new Map<string, Set<string>>();
	#dependentMap = new Map<string, Set<string>>();
	#pendingAssetIds = new Set<string>();
	#pendingAssets = new Map<string, Asset>();
	#config;
	#logger;
	#pluginDriver;

	constructor(
		config: ValidatedContentThingOptions,
		plugins: Plugin[],
		logger: Logger,
	) {
		this.#config = config;
		this.#logger = logger;
		this.#pluginDriver = new PluginDriver(plugins);
	}

	async #addEntryAssetIds() {
		const entryAssetIds = await this.#pluginDriver.addEntryAssetIds();

		for (const assetId of entryAssetIds) {
			this.#pendingAssetIds.add(assetId);
		}
	}

	async #createBundles() {
		const bundleConfigs = await this.#pluginDriver.createBundle(this);
		for (const { id, meta } of bundleConfigs) {
			this.#bundles.set(id, new Bundle(id, meta));
		}
	}

	async #transformBundles() {
		const bundlePromises = [];
		for (const bundle of this.#bundles.values()) {
			bundlePromises.push(
				this.#pluginDriver.transformBundle({ bundle, graph: this }),
			);
		}
		await Promise.all(bundlePromises);
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
						new Asset(assetId, loadResult.value, this),
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

							let assetDependents = this.#dependentMap.get(dependency);
							if (!assetDependents) {
								assetDependents = new Set();
								this.#dependentMap.set(dependency, assetDependents);
							}
							assetDependents.add(id);
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

	async #writeBundles() {
		const writeBundlePromises = [];
		for (const bundle of this.#bundles.values()) {
			writeBundlePromises.push(this.#pluginDriver.writeBundle(bundle));
		}
		await Promise.all(writeBundlePromises);
	}

	async bundle() {
		this.#pluginDriver.bundle();
		this.#pluginDriver.configResolved(this.#config);
		await this.#addEntryAssetIds();
		await this.#generateAssetGraph();
		await this.#createBundles();
		await this.#transformBundles();
		await this.#writeBundles();
	}

	get assets() {
		return Array.from(this.#assets.values());
	}

	getAsset(id: string): Asset | undefined {
		return this.#assets.get(id);
	}

	getDependencies(id: string): Asset[] {
		const dependencies = this.#dependencyMap.get(id);
		if (!dependencies) return [];
		return Array.from(dependencies)
			.map((depId) => this.#assets.get(depId))
			.filter(Boolean) as Asset[];
	}

	getDependents(id: string): Asset[] {
		const dependents = this.#dependentMap.get(id);
		if (!dependents) return [];
		return Array.from(dependents)
			.map((depId) => this.#assets.get(depId))
			.filter(Boolean) as Asset[];
	}

	getEntryAssets(id: string): Asset[] {
		const entryAssets = new Set<Asset>();
		const visit = (currentId: string) => {
			const dependents = this.getDependents(currentId);
			if (dependents.length === 0) {
				const asset = this.getAsset(currentId);
				if (asset) entryAssets.add(asset);
			} else {
				for (const dependent of dependents) {
					visit(dependent.id);
				}
			}
		};
		visit(id);
		return Array.from(entryAssets);
	}

	reset() {
		this.#assets.clear();
		this.#bundles.clear();
		this.#dependencyMap.clear();
		this.#dependentMap.clear();
		this.#pendingAssetIds.clear();
		this.#pendingAssets.clear();
	}
}

export class Asset {
	#id;
	#value;
	#graph;

	constructor(id: string, value: unknown, graph: AssetGraph) {
		this.#id = id;
		this.#value = value;
		this.#graph = graph;
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

	get dependencyAssets(): Asset[] {
		return this.#graph.getDependencies(this.#id);
	}

	get dependentAssets(): Asset[] {
		return this.#graph.getDependents(this.#id);
	}

	get entryAssets(): Asset[] {
		return this.#graph.getEntryAssets(this.#id);
	}
}

export class Bundle {
	#id;
	#assets = new Set<Asset>();
	#meta: unknown;
	constructor(id: string, meta: unknown) {
		this.#id = id;
		this.#meta = meta;
	}
	addAsset(asset: Asset) {
		this.#assets.add(asset);
	}
	get assets() {
		return Array.from(this.#assets);
	}
	deleteAsset(asset: Asset) {
		this.#assets.delete(asset);
	}
	get id() {
		return this.#id;
	}
	get meta() {
		return this.#meta;
	}
}
