import type { ValidatedContentThingOptions } from '../config/options.js';
import type { Asset, AssetGraph, Bundle } from './graph.js';

type MaybePromise<T> = T | Promise<T>;

export interface Plugin {
	name: string;
	bundle?(bundler: BundleContext): unknown;
}

type AddEntryAssetIdsCallback = () => MaybePromise<string[]>;
type CreateBundleCallback = (
	graph: AssetGraph,
) => MaybePromise<{ id: string; meta?: Record<string, unknown> }[]>;
type ConfigResolvedCallback = (config: ValidatedContentThingOptions) => void;

interface LoadIdOptions<T extends string> {
	filter: (arg: string) => arg is T;
	callback: (id: T, graph: AssetGraph) => MaybePromise<{ value: unknown }>;
}

interface LoadDependenciesOptions<T extends Asset> {
	filter: (asset: Asset) => asset is T;
	callback: (asset: T) => MaybePromise<string[]>;
}

interface TransformAssetOptions<T extends Asset> {
	filter: (asset: Asset) => asset is T;
	callback: (asset: T) => MaybePromise<Asset>;
}

interface TransformBundleOptions<T extends Bundle> {
	filter: (bundle: Bundle) => bundle is T;
	callback: (arg: { bundle: T; graph: AssetGraph }) => MaybePromise<Bundle>;
}

interface WriteBundleOptions<T extends Bundle> {
	filter: (bundle: Bundle) => bundle is T;
	callback: (bundle: T) => MaybePromise<void>;
}

interface BundleContext {
	addEntryAssetIds(callback: AddEntryAssetIdsCallback): void;
	configResolved(callback: ConfigResolvedCallback): void;
	loadId<T extends string>(options: LoadIdOptions<T>): void;
	loadDependencies<T extends Asset>(options: LoadDependenciesOptions<T>): void;
	transformAsset<T extends Asset>(options: TransformAssetOptions<T>): void;
	createBundle(callback: CreateBundleCallback): void;
	transformBundle<T extends Bundle>(options: TransformBundleOptions<T>): void;
	writeBundle<T extends Bundle>(options: WriteBundleOptions<T>): void;
}

export class PluginDriver {
	#callbacks = {
		addEntryAssetIds: [] as AddEntryAssetIdsCallback[],
		configResolved: [] as ConfigResolvedCallback[],
		createBundle: [] as CreateBundleCallback[],
		loadId: [] as LoadIdOptions<string>[],
		loadDependencies: [] as LoadDependenciesOptions<Asset>[],
		transformAsset: [] as TransformAssetOptions<Asset>[],
		transformBundle: [] as TransformBundleOptions<Bundle>[],
		writeBundle: [] as WriteBundleOptions<Bundle>[],
	};
	#plugins;
	constructor(plugins: Plugin[]) {
		this.#plugins = plugins;
	}
	async addEntryAssetIds() {
		const promises = [];
		for (const callback of this.#callbacks.addEntryAssetIds) {
			promises.push(callback());
		}
		const promiseResult = await Promise.all(promises);
		return promiseResult.flat();
	}
	bundle() {
		const callbacks = this.#callbacks;
		for (const plugin of this.#plugins) {
			plugin.bundle?.({
				addEntryAssetIds(callback) {
					callbacks.addEntryAssetIds.push(callback);
				},
				configResolved(callback) {
					callbacks.configResolved.push(callback);
				},
				createBundle(callback) {
					callbacks.createBundle.push(callback);
				},
				loadId(options) {
					callbacks.loadId.push(options as unknown as LoadIdOptions<string>);
				},
				loadDependencies(options) {
					callbacks.loadDependencies.push(
						options as unknown as LoadDependenciesOptions<Asset>,
					);
				},
				transformAsset(options) {
					callbacks.transformAsset.push(
						options as unknown as TransformAssetOptions<Asset>,
					);
				},
				transformBundle(options) {
					callbacks.transformBundle.push(
						options as unknown as TransformBundleOptions<Bundle>,
					);
				},
				writeBundle(options) {
					callbacks.writeBundle.push(
						options as unknown as WriteBundleOptions<Bundle>,
					);
				},
			});
		}
	}
	configResolved(config: ValidatedContentThingOptions) {
		for (const callback of this.#callbacks.configResolved) {
			callback(config);
		}
	}
	async createBundle(graph: AssetGraph) {
		const bundlePromises = [];
		for (const callback of this.#callbacks.createBundle) {
			bundlePromises.push(callback(graph));
		}
		return (await Promise.all(bundlePromises)).flat();
	}

	async loadId(id: string, graph: AssetGraph) {
		let loadResult;
		for (const options of this.#callbacks.loadId) {
			if (!options.filter(id)) continue;
			loadResult = { ...(await options.callback(id, graph)), id };
			break;
		}
		return loadResult;
	}
	async loadDependencies(asset: Asset): Promise<string[]> {
		const loadResultPromises = [];
		for (const options of this.#callbacks.loadDependencies) {
			const loadDependencyPromise = () => {
				if (!options.filter(asset)) return [];
				return options.callback(asset);
			};
			loadResultPromises.push(loadDependencyPromise());
		}
		return (await Promise.all(loadResultPromises)).flat();
	}
	async transformAsset(asset: Asset): Promise<Asset> {
		for (const options of this.#callbacks.transformAsset) {
			if (!options.filter(asset)) continue;
			asset = await options.callback(asset);
		}
		return asset;
	}
	async transformBundle(args: { bundle: Bundle; graph: AssetGraph }) {
		for (const options of this.#callbacks.transformBundle) {
			if (!options.filter(args.bundle)) continue;
			await options.callback(args);
		}
	}
	writeBundle(bundle: Bundle) {
		const bundlePromises = [];
		for (const options of this.#callbacks.writeBundle) {
			if (!options.filter(bundle)) continue;
			bundlePromises.push(options.callback(bundle));
		}
		return Promise.all(bundlePromises);
	}
}
