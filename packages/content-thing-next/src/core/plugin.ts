import type { ValidatedContentThingConfig } from '../config/config.js';
import type { DropLast, Last, MaybePromise, Simplify } from '../types.js';

export interface Plugin {
	name: string;
	bundle(bundler: BundleContext): unknown;
	monitor?(monitor: MonitorContext): unknown;
}

export interface CallbackOptions {
	filter: RegExp;
}

export type AddEntryAssetIdsCallback = () => MaybePromise<string[]>;

export type ConfigResolvedCallback = (
	config: ValidatedContentThingConfig,
) => void;

export type LoadIdCallback = (id: string) => MaybePromise<{ value: unknown }>;

type BeforeCallback<T> = T extends (...args: infer A) => unknown
	? (...args: { [K in keyof A]?: A[K] }) => void
	: never;

type AfterCallback<T> = T extends (...args: unknown[]) => infer R
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
			...args: unknown[]
		) => unknown
			? (
					...args: [
						...head: DropLast<Parameters<T[K]>>,
						callback: BeforeCallback<Last<Parameters<T[K]>>>,
					]
				) => void
			: T[K];
	} & {
		[K in keyof T as `after${Capitalize<string & K>}`]: T[K] extends (
			...args: unknown[]
		) => unknown
			? (
					...args: [
						...head: DropLast<Parameters<T[K]>>,
						callback: AfterCallback<Last<Parameters<T[K]>>>,
					]
				) => void
			: T[K];
	}
>;

interface BundleContext {
	addEntryAssetIds(callback: AddEntryAssetIdsCallback): void;
	configResolved(callback: ConfigResolvedCallback): void;
	loadId(options: CallbackOptions, callback: LoadIdCallback): void;
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
			plugin.bundle({
				addEntryAssetIds(callback) {
					callbacks.addEntryAssetIds.push(callback);
				},
				configResolved(callback) {
					callbacks.configResolved.push(callback);
				},
				loadId(options, callback) {
					callbacks.loadId.push([options, callback]);
				},
			});
		}
	}
	configResolved(config: ValidatedContentThingConfig) {
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
			});
		}
	}
}
