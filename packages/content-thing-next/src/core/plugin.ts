import type { ValidatedContentThingOptions } from '../config/options.js';
import type { DropLast, Last, MaybePromise, Simplify } from '../types.js';
import type { Asset } from './graph.js';

export interface Plugin {
	name: string;
	bundle?(bundler: BundleContext): unknown;
	monitor?(monitor: MonitorContext): unknown;
}

export interface CallbackOptions {
	filter: RegExp;
}

export type AddEntryAssetIdsCallback = () => MaybePromise<string[]>;
export type ConfigResolvedCallback = (
	config: ValidatedContentThingOptions,
) => void;
export type LoadIdCallback = (id: string) => MaybePromise<{ value: unknown }>;
export type LoadDependenciesCallback = (asset: Asset) => MaybePromise<string[]>;
export type TransformAssetCallback = (asset: Asset) => MaybePromise<Asset>;
export type WriteAssetCallback = (asset: Asset) => MaybePromise<void>;

/* eslint-disable @typescript-eslint/no-explicit-any */
type BeforeCallback<T> = T extends (...args: infer A) => unknown
	? (...args: { [K in keyof A]?: A[K] }) => void
	: never;

type AfterCallback<T> = T extends (...args: any[]) => infer R
	? (value?: R) => void
	: never;

/**
 * Prepend "before" and "after" to every context hook. Make the arguments of the
 * context hook the arguments to the "before" hook and the return type of the
 * content hook the argument of the "after".
 */
type PrependBeforeAfter<T> = Simplify<
	{
		[K in keyof T as `before${Capitalize<string & K>}`]: T[K] extends (
			...args: any[]
		) => any
			? (
					...args: [
						...head: DropLast<Parameters<T[K]>>,
						callback: BeforeCallback<Last<Parameters<T[K]>>>,
					]
				) => void
			: T[K];
	} & {
		[K in keyof T as `after${Capitalize<string & K>}`]: T[K] extends (
			...args: any[]
		) => any
			? (
					...args: [
						...head: DropLast<Parameters<T[K]>>,
						callback: AfterCallback<Last<Parameters<T[K]>>>,
					]
				) => void
			: T[K];
	}
>;

/* eslint-enable @typescript-eslint/no-explicit-any */

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
	writeAsset(options: CallbackOptions, callback: WriteAssetCallback): void;
}

type MonitorContext = PrependBeforeAfter<BundleContext>;

export class PluginDriver {
	#callbacks = {
		beforeAddEntryAssetIds: [] as BeforeCallback<AddEntryAssetIdsCallback>[],
		addEntryAssetIds: [] as AddEntryAssetIdsCallback[],
		afterAddEntryAssetIds: [] as AfterCallback<AddEntryAssetIdsCallback>[],

		beforeConfigResolved: [] as BeforeCallback<ConfigResolvedCallback>[],
		configResolved: [] as ConfigResolvedCallback[],
		afterConfigResolved: [] as AfterCallback<ConfigResolvedCallback>[],

		beforeLoadId: [] as [CallbackOptions, BeforeCallback<LoadIdCallback>][],
		loadId: [] as [CallbackOptions, LoadIdCallback][],
		afterLoadId: [] as [CallbackOptions, AfterCallback<LoadIdCallback>][],

		beforeLoadDependencies: [] as [
			CallbackOptions,
			BeforeCallback<LoadDependenciesCallback>,
		][],
		loadDependencies: [] as [CallbackOptions, LoadDependenciesCallback][],
		afterLoadDependencies: [] as [
			CallbackOptions,
			AfterCallback<LoadDependenciesCallback>,
		][],

		beforeTransformAsset: [] as [
			CallbackOptions,
			BeforeCallback<TransformAssetCallback>,
		][],
		transformAsset: [] as [CallbackOptions, TransformAssetCallback][],
		afterTransformAsset: [] as [
			CallbackOptions,
			AfterCallback<TransformAssetCallback>,
		][],

		beforeWriteAsset: [] as [
			CallbackOptions,
			BeforeCallback<WriteAssetCallback>,
		][],
		writeAsset: [] as [CallbackOptions, WriteAssetCallback][],
		afterWriteAsset: [] as [
			CallbackOptions,
			AfterCallback<WriteAssetCallback>,
		][],
	};
	#plugins;
	constructor(plugins: Plugin[]) {
		this.#plugins = plugins;
	}
	async addEntryAssetIds() {
		const promises = [];
		for (const callback of this.#callbacks.addEntryAssetIds) {
			promises.push(
				(async () => {
					for (const beforeCallback of this.#callbacks.beforeAddEntryAssetIds) {
						beforeCallback();
					}
					const entryModules = await callback();
					for (const afterCallback of this.#callbacks.afterAddEntryAssetIds) {
						afterCallback();
					}
					return entryModules;
				})(),
			);
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
				loadId(options, callback) {
					callbacks.loadId.push([options, callback]);
				},
				loadDependencies(options, callback) {
					callbacks.loadDependencies.push([options, callback]);
				},
				transformAsset(options, callback) {
					callbacks.transformAsset.push([options, callback]);
				},
				writeAsset(options, callback) {
					callbacks.writeAsset.push([options, callback]);
				},
			});
		}
	}
	configResolved(config: ValidatedContentThingOptions) {
		for (const callback of this.#callbacks.configResolved) {
			for (const beforeCallback of this.#callbacks.beforeConfigResolved) {
				beforeCallback(config);
			}
			callback(config);
			for (const afterCallback of this.#callbacks.afterConfigResolved) {
				afterCallback();
			}
		}
	}
	async loadId(id: string) {
		let loadResult;
		for (const [options, callback] of this.#callbacks.loadId) {
			if (!options.filter.test(id)) continue;
			for (const [beforeOptions, beforeCallback] of this.#callbacks
				.beforeLoadId) {
				if (!beforeOptions.filter.test(id)) continue;
				beforeCallback(id);
			}
			const _loadResultMaybePromise = callback(id);
			const _loadResult = await _loadResultMaybePromise;
			for (const [afterOptions, afterCallback] of this.#callbacks.afterLoadId) {
				if (!afterOptions.filter.test(id)) continue;
				afterCallback(_loadResultMaybePromise);
			}
			loadResult = { ..._loadResult, id };
			break;
		}

		return loadResult;
	}
	async loadDependencies(asset: Asset): Promise<string[]> {
		const loadResultPromises = [];
		for (const [options, callback] of this.#callbacks.loadDependencies) {
			const loadDependencyPromise = async () => {
				if (!options.filter.test(asset.id)) return [];
				for (const [beforeOptions, beforeCallback] of this.#callbacks
					.beforeLoadDependencies) {
					if (!beforeOptions.filter.test(asset.id)) continue;
					beforeCallback(asset);
				}
				const _loadResultMaybePromise = callback(asset);
				const _loadResult = await _loadResultMaybePromise;
				for (const [afterOptions, afterCallback] of this.#callbacks
					.afterLoadDependencies) {
					if (!afterOptions.filter.test(asset.id)) continue;
					afterCallback(_loadResultMaybePromise);
				}
				return _loadResult;
			};
			loadResultPromises.push(loadDependencyPromise());
		}

		return (await Promise.all(loadResultPromises)).flat();
	}
	async transformAsset(asset: Asset): Promise<Asset> {
		for (const [options, callback] of this.#callbacks.transformAsset) {
			if (!options.filter.test(asset.id)) continue;
			for (const [beforeOptions, beforeCallback] of this.#callbacks
				.beforeTransformAsset) {
				if (!beforeOptions.filter.test(asset.id)) continue;
				beforeCallback(asset);
			}
			const _transformResultMaybePromise = callback(asset);
			await _transformResultMaybePromise;
			for (const [afterOptions, afterCallback] of this.#callbacks
				.afterTransformAsset) {
				if (!afterOptions.filter.test(asset.id)) continue;
				afterCallback(_transformResultMaybePromise);
			}
		}

		return asset;
	}
	async writeAsset(asset: Asset): Promise<void> {
		for (const [options, callback] of this.#callbacks.writeAsset) {
			if (!options.filter.test(asset.id)) continue;
			for (const [beforeOptions, beforeCallback] of this.#callbacks
				.beforeWriteAsset) {
				if (!beforeOptions.filter.test(asset.id)) continue;
				beforeCallback(asset);
			}
			const _writeResultMaybePromise = callback(asset);
			await _writeResultMaybePromise;
			for (const [afterOptions, afterCallback] of this.#callbacks
				.afterWriteAsset) {
				if (!afterOptions.filter.test(asset.id)) continue;
				afterCallback(_writeResultMaybePromise);
			}
		}
	}
	monitor() {
		const callbacks = this.#callbacks;
		for (const plugin of this.#plugins) {
			plugin.monitor?.({
				beforeAddEntryAssetIds(callback) {
					callbacks.beforeAddEntryAssetIds.push(callback);
				},
				afterAddEntryAssetIds(callback) {
					callbacks.afterAddEntryAssetIds.push(callback);
				},
				beforeConfigResolved(callback) {
					callbacks.beforeConfigResolved.push(callback);
				},
				afterConfigResolved(callback) {
					callbacks.afterConfigResolved.push(callback);
				},
				beforeLoadId(options, callback) {
					callbacks.beforeLoadId.push([options, callback]);
				},
				afterLoadId(options, callback) {
					callbacks.afterLoadId.push([options, callback]);
				},
				beforeLoadDependencies(options, callback) {
					callbacks.beforeLoadDependencies.push([options, callback]);
				},
				afterLoadDependencies(options, callback) {
					callbacks.afterLoadDependencies.push([options, callback]);
				},
				beforeTransformAsset(options, callback) {
					callbacks.beforeTransformAsset.push([options, callback]);
				},
				afterTransformAsset(options, callback) {
					callbacks.afterTransformAsset.push([options, callback]);
				},
				beforeWriteAsset(options, callback) {
					callbacks.beforeWriteAsset.push([options, callback]);
				},
				afterWriteAsset(options, callback) {
					callbacks.afterWriteAsset.push([options, callback]);
				},
			});
		}
	}
}
