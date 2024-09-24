import * as v from 'valibot';
import type { CollectionConfig } from '../config/types.js';
import type { ValidatedContentThingOptions } from '../config/options.js';
import { CollectionConfigSchema } from '../config/schema.js';
import { Err, Ok, type Result } from '../utils/result.js';

type MaybePromise<T> = T | Promise<T>;

export interface Plugin {
	name: string;
	bundle?(bundler: BundleContext): unknown;
}

interface ProcessConfigArg {
	readonly config: CollectionConfig;
	readonly options: ValidatedContentThingOptions;
}

type LoadCollectionConfigCallback = (
	filepath: string,
) => MaybePromise<Result<unknown> | void>;
type TransformCollectionConfigCallback = (
	config: CollectionConfig,
) => MaybePromise<void>;
type WriteCollectionConfigCallback = (
	arg: ProcessConfigArg,
) => MaybePromise<void>;

type LoadCollectionItemsCallback = (
	arg: ProcessConfigArg,
) => MaybePromise<unknown[] | undefined | void>;

interface BundleContext {
	loadCollectionConfig(callback: LoadCollectionConfigCallback): void;
	transformCollectionConfig(callback: TransformCollectionConfigCallback): void;
	writeCollectionConfig(callback: WriteCollectionConfigCallback): void;

	loadCollectionItems(callback: LoadCollectionItemsCallback): void;
}

export class PluginDriver {
	#callbacks = {
		loadCollectionConfig: [] as LoadCollectionConfigCallback[],
		transformCollectionConfig: [] as TransformCollectionConfigCallback[],
		writeCollectionConfig: [] as WriteCollectionConfigCallback[],

		loadCollectionItems: [] as LoadCollectionItemsCallback[],
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
				loadCollectionItems(callback) {
					callbacks.loadCollectionItems.push(callback);
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
	async loadCollectionItems(arg: ProcessConfigArg) {
		const entryPromises = [];
		for (const callback of this.#callbacks.loadCollectionItems) {
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
			transformError.error.message = `Plugin transform produced invalid config. ${JSON.stringify(filepath)}`;
			return transformError;
		}
		return Ok();
	}
	async writeCollectionConfig(arg: ProcessConfigArg) {
		const writePromises = [];
		for (const callback of this.#callbacks.writeCollectionConfig) {
			writePromises.push(callback(arg));
		}
		await Promise.all(writePromises);
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
