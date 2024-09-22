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

type LoadIdArg<T extends string> = {
	readonly id: T;
	readonly graph: AssetGraph;
};
interface LoadIdOptions<T extends string> {
	filter: (arg: string) => arg is T;
	callback: (arg: LoadIdArg<T>) => MaybePromise<{ value: unknown }>;
}

type LoadDependeiciesArg<T extends Asset> = {
	readonly asset: T;
	readonly graph: AssetGraph;
};
interface LoadDependenciesOptions<T extends Asset> {
	filter: (asset: Asset) => asset is T;
	callback: (arg: LoadDependeiciesArg<T>) => MaybePromise<string[]>;
}

type TransformAssetArg<T extends Asset> = {
	readonly asset: T;
	readonly graph: AssetGraph;
};
interface TransformAssetOptions<T extends Asset> {
	filter: (asset: Asset) => asset is T;
	callback: (arg: TransformAssetArg<T>) => MaybePromise<Asset>;
}

type TransformBundleArg<T extends Bundle> = {
	readonly bundle: T;
	readonly graph: AssetGraph;
};
interface TransformBundleOptions<T extends Bundle> {
	filter: (bundle: Bundle) => bundle is T;
	callback: (arg: TransformBundleArg<T>) => MaybePromise<Bundle>;
}

type WriteBundleArg<T extends Bundle> = {
	readonly bundle: T;
	readonly graph: AssetGraph;
};
interface WriteBundleOptions<T extends Bundle> {
	filter: (bundle: Bundle) => bundle is T;
	callback: (bundle: WriteBundleArg<T>) => MaybePromise<void>;
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

	async loadId(arg: LoadIdArg<string>) {
		let loadResult;
		for (const options of this.#callbacks.loadId) {
			if (!options.filter(arg.id)) continue;
			loadResult = { ...(await options.callback(arg)), id: arg.id };
			break;
		}
		return loadResult;
	}
	async loadDependencies(arg: LoadDependeiciesArg<Asset>): Promise<string[]> {
		const loadResultPromises = [];
		for (const options of this.#callbacks.loadDependencies) {
			const loadDependencyPromise = () => {
				if (!options.filter(arg.asset)) return [];
				return options.callback(arg);
			};
			loadResultPromises.push(loadDependencyPromise());
		}
		return (await Promise.all(loadResultPromises)).flat();
	}
	async transformAsset(arg: TransformAssetArg<Asset>): Promise<Asset> {
		for (const options of this.#callbacks.transformAsset) {
			if (!options.filter(arg.asset)) continue;
			await options.callback(arg);
		}
		return arg.asset;
	}
	async transformBundle(arg: TransformBundleArg<Bundle>) {
		for (const options of this.#callbacks.transformBundle) {
			if (!options.filter(arg.bundle)) continue;
			await options.callback(arg);
		}
	}
	writeBundle(arg: WriteBundleArg<Bundle>) {
		const bundlePromises = [];
		for (const options of this.#callbacks.writeBundle) {
			if (!options.filter(arg.bundle)) continue;
			bundlePromises.push(options.callback(arg));
		}
		return Promise.all(bundlePromises);
	}
}
