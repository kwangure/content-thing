import * as v from 'valibot';
import type { CollectionConfig } from '../config/types.js';
import type { CollectionItem } from './graph.js';
import type { ValidatedContentThingOptions } from '../config/options.js';
import { Err, Ok, type Result } from '../utils/result.js';
import { CollectionConfigSchema } from '../config/schema.js';

type MaybePromise<T> = T | Promise<T>;

export interface Plugin {
	name: string;
	bundle?(bundler: BundleContext): unknown;
}

type LoadCollectionConfigCallback = (
	filepath: string,
) => MaybePromise<Result<object, Error> | void>;
type TransformCollectionConfigCallback = (
	config: CollectionConfig,
) => MaybePromise<void>;

interface BaseCallbackArg {
	readonly config: CollectionConfig;
	readonly options: ValidatedContentThingOptions;
}
type WriteCollectionConfigCallback = (
	arg: BaseCallbackArg,
) => MaybePromise<void>;

type ResolveCollectionItemsCallback = (
	arg: BaseCallbackArg,
) => MaybePromise<string[] | undefined | void>;

interface FilepathCallbackArg extends BaseCallbackArg {
	readonly filepath: string;
}
type LoadCollectionItemCallback = (
	arg: FilepathCallbackArg,
) => MaybePromise<Result<CollectionItem, string | Error> | undefined | void>;

interface ItemCallbackArg extends FilepathCallbackArg, CollectionItem {}
type WriteCollectionItemCallback = (
	arg: ItemCallbackArg,
) => MaybePromise<unknown[] | undefined | void>;

interface BundleContext {
	loadCollectionConfig(callback: LoadCollectionConfigCallback): void;
	transformCollectionConfig(callback: TransformCollectionConfigCallback): void;
	writeCollectionConfig(callback: WriteCollectionConfigCallback): void;

	resolveCollectionItems(callback: ResolveCollectionItemsCallback): void;
	loadCollectionItem(callback: LoadCollectionItemCallback): void;
	writeCollectionItem(callback: WriteCollectionItemCallback): void;
}

export class PluginDriver {
	#callbacks = {
		loadCollectionConfig: [] as LoadCollectionConfigCallback[],
		transformCollectionConfig: [] as TransformCollectionConfigCallback[],
		writeCollectionConfig: [] as WriteCollectionConfigCallback[],

		resolveCollectionItems: [] as ResolveCollectionItemsCallback[],
		loadCollectionItem: [] as LoadCollectionItemCallback[],
		writeCollectionItem: [] as WriteCollectionItemCallback[],
	};
	#plugins;
	constructor(plugins: Plugin[]) {
		this.#plugins = plugins;
	}
	initialize() {
		const callbacks = this.#callbacks;
		for (const plugin of this.#plugins) {
			plugin.bundle?.({
				/*  ----  Collection config ---- */
				loadCollectionConfig(callback) {
					callbacks.loadCollectionConfig.push(callback);
				},
				transformCollectionConfig(callback) {
					callbacks.transformCollectionConfig.push(callback);
				},
				writeCollectionConfig(callback) {
					callbacks.writeCollectionConfig.push(callback);
				},
				/*  ----  Collection items ---- */
				resolveCollectionItems(callback) {
					callbacks.resolveCollectionItems.push(callback);
				},
				loadCollectionItem(callback) {
					callbacks.loadCollectionItem.push(callback);
				},
				writeCollectionItem(callback) {
					callbacks.writeCollectionItem.push(callback);
				},
			});
		}
	}
	async loadCollectionConfig(filepath: string) {
		for (const callback of this.#callbacks.loadCollectionConfig) {
			const loadResult = await callback(filepath);
			if (!loadResult) continue;
			if (!loadResult.ok) return loadResult;

			const collectionConfig = Object.assign({}, loadResult.value || {}, {
				filepath,
			});

			return validateCollectionConfig(collectionConfig, filepath);
		}

		return Err(
			'config-not-found',
			new Error(
				`Unable to load collection config at ${JSON.stringify(filepath)}.`,
			),
		);
	}
	async loadCollectionItem(arg: FilepathCallbackArg) {
		for (const callback of this.#callbacks.loadCollectionItem) {
			const item = await callback(arg);
			if (item) return item;
		}

		return Err(
			'load-failure',
			`Unable to load collection item at ${JSON.stringify(arg.filepath)}.`,
		);
	}
	async resolveCollectionItems(arg: BaseCallbackArg) {
		const entryPromises = [];
		for (const callback of this.#callbacks.resolveCollectionItems) {
			entryPromises.push(callback(arg));
		}
		return (await Promise.all(entryPromises))
			.filter((e) => Array.isArray(e))
			.flat();
	}
	async transformCollectionConfig(config: CollectionConfig) {
		const transformPromises = [];
		const { filepath } = config;
		for (const callback of this.#callbacks.transformCollectionConfig) {
			transformPromises.push(
				(async () => {
					await callback(config);
					return validateCollectionConfig(config, filepath);
				})(),
			);
		}
		const [transformError] = (await Promise.all(transformPromises)).filter(
			(result) => !result.ok,
		);
		if (transformError) {
			transformError.meta.message = `Plugin transform produced invalid config. ${JSON.stringify(filepath)}`;
			return transformError;
		}
		return Ok();
	}
	async writeCollectionConfig(arg: BaseCallbackArg) {
		const writePromises = [];
		for (const callback of this.#callbacks.writeCollectionConfig) {
			writePromises.push(callback(arg));
		}
		await Promise.allSettled(writePromises);
	}
	async writeCollectionItem(arg: ItemCallbackArg) {
		const writePromises = [];
		for (const callback of this.#callbacks.writeCollectionItem) {
			writePromises.push(callback(arg));
		}
		await Promise.allSettled(writePromises);
	}
}

function validateCollectionConfig(collectionConfig: unknown, filepath: string) {
	const validateResult = v.safeParse(CollectionConfigSchema, collectionConfig);
	if (!validateResult.success) {
		let errorMessage = `Invalid collection config`;
		if (filepath) {
			errorMessage += ` at ${JSON.stringify(filepath)}`;
		}
		errorMessage += '.';
		for (const issue of validateResult.issues) {
			errorMessage += `\n\t- ${issue.message}`;
			const path = issue.path
				?.map((item) => ('key' in item ? item.key : ''))
				.join('.');
			if (path) {
				errorMessage += ` at path "${path}"`;
			}
			errorMessage += '.';
		}
		return Err('invalid-type', new Error(errorMessage));
	}
	return Ok(validateResult.output);
}
