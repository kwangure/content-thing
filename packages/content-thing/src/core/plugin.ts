import type { ValidatedContentThingOptions } from '../config/options.js';
import type { Asset, AssetGraph, Bundle } from './graph.js';
import type { MaybePromise } from '../types.js';

export interface Plugin {
	name: string;
	bundle?(bundler: BundleContext): unknown;
}

export interface CallbackOptions {
	filter: RegExp;
}

export type AddEntryAssetIdsCallback = () => MaybePromise<string[]>;
export type CreateBundleCallback = (
	graph: AssetGraph,
) => MaybePromise<{ id: string; meta?: Record<string, unknown> }[]>;
export type ConfigResolvedCallback = (
	config: ValidatedContentThingOptions,
) => void;
export type LoadIdCallback = (id: string) => MaybePromise<{ value: unknown }>;
export type LoadDependenciesCallback = (asset: Asset) => MaybePromise<string[]>;
export type TransformAssetCallback = (asset: Asset) => MaybePromise<Asset>;
export type TransformBundleCallback = (args: {
	bundle: Bundle;
	graph: AssetGraph;
}) => MaybePromise<Bundle>;
export type WriteBundleCallback = (bundle: Bundle) => MaybePromise<void>;

interface BundleContext {
	addEntryAssetIds(callback: AddEntryAssetIdsCallback): void;
	configResolved(callback: ConfigResolvedCallback): void;
	loadId(options: CallbackOptions, callback: LoadIdCallback): void;
	loadDependencies(
		options: CallbackOptions,
		callback: LoadDependenciesCallback,
	): void;
	transformAsset(
		options: CallbackOptions,
		callback: TransformAssetCallback,
	): void;
	createBundle(callback: CreateBundleCallback): void;
	transformBundle(callback: TransformBundleCallback): void;
	writeBundle(callback: WriteBundleCallback): void;
}

export class PluginDriver {
	#callbacks = {
		addEntryAssetIds: [] as AddEntryAssetIdsCallback[],
		configResolved: [] as ConfigResolvedCallback[],
		createBundle: [] as CreateBundleCallback[],
		loadId: [] as [CallbackOptions, LoadIdCallback][],
		loadDependencies: [] as [CallbackOptions, LoadDependenciesCallback][],
		transformAsset: [] as [CallbackOptions, TransformAssetCallback][],
		transformBundle: [] as TransformBundleCallback[],
		writeBundle: [] as WriteBundleCallback[],
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
				loadId(options, callback) {
					callbacks.loadId.push([options, callback]);
				},
				loadDependencies(options, callback) {
					callbacks.loadDependencies.push([options, callback]);
				},
				transformAsset(options, callback) {
					callbacks.transformAsset.push([options, callback]);
				},
				transformBundle(callback) {
					callbacks.transformBundle.push(callback);
				},
				writeBundle(callback) {
					callbacks.writeBundle.push(callback);
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
		// Parallel - All
		const bundlePromises = [];
		for (const callback of this.#callbacks.createBundle) {
			bundlePromises.push(callback(graph));
		}
		return (await Promise.all(bundlePromises)).flat();
	}

	async loadId(id: string) {
		// Serial - First
		let loadResult;
		for (const [options, callback] of this.#callbacks.loadId) {
			if (!options.filter.test(id)) continue;
			loadResult = { ...(await callback(id)), id };
			break;
		}

		return loadResult;
	}
	async loadDependencies(asset: Asset): Promise<string[]> {
		const loadResultPromises = [];
		// Serial - First
		for (const [options, callback] of this.#callbacks.loadDependencies) {
			const loadDependencyPromise = () => {
				if (!options.filter.test(asset.id)) return [];
				return callback(asset);
			};
			loadResultPromises.push(loadDependencyPromise());
		}

		return (await Promise.all(loadResultPromises)).flat();
	}
	async transformAsset(asset: Asset): Promise<Asset> {
		// Serial - All
		for (const [options, callback] of this.#callbacks.transformAsset) {
			if (!options.filter.test(asset.id)) continue;
			await callback(asset);
		}

		return asset;
	}
	async transformBundle(args: { bundle: Bundle; graph: AssetGraph }) {
		// Serial - All
		for (const callback of this.#callbacks.transformBundle) {
			await callback(args);
		}
	}
	writeBundle(bundle: Bundle) {
		const bundlePromises = [];
		// Parallel - all
		for (const callback of this.#callbacks.writeBundle) {
			bundlePromises.push(callback(bundle));
		}
		return Promise.all(bundlePromises);
	}
}
