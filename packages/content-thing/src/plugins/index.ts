import { collectionConfig, pluginCollectionConfig } from '../config/load.js';
import type { CollectionConfig, PluginCollectionConfig } from '../config/types';
import { Err, Ok } from '../result.js';
import type { ThingConfig } from '../state/state';
import fs from 'node:fs';
import path from 'node:path';

export interface CollectionPlugin {
	name: string;
	setup: (build: PluginContainer) => any;
}

interface BuildHookOptions {
	filter: {
		path?: RegExp;
		collection?: {
			type?: RegExp;
		};
	};
}

interface OnCollectionConfigHandler {
	name: string;
	options: BuildHookOptions;
	callback: (
		args: CollectionConfig,
	) => Promise<Partial<PluginCollectionConfig>>;
}

interface OnLoadHandler {
	name: string;
	options: BuildHookOptions;
	callback: (args: OnLoadArgs) => Promise<OnLoadResult>;
}

interface OnLoadArgs {
	path: string;
	collection: {
		type: string;
	};
}
export interface OnLoadResult {
	record: Record<string, string | number> & { _id: string };
}

export class PluginContainer {
	private onCollectionConfigHandlers: OnCollectionConfigHandler[] = [];
	private onLoadHandlers: OnLoadHandler[] = [];
	private plugin!: CollectionPlugin;

	constructor(plugins: CollectionPlugin[]) {
		for (const plugin of plugins) {
			this.plugin = plugin;
			plugin.setup(this);
		}
	}

	onCollectionConfig(
		options: OnCollectionConfigHandler['options'],
		callback: OnCollectionConfigHandler['callback'],
	): void {
		this.onCollectionConfigHandlers.push({
			name: this.plugin.name,
			options,
			callback,
		});
	}

	async loadCollectionConfig(thingConfig: ThingConfig, collectionName: string) {
		const configPath = path.join(
			thingConfig.collectionsDir,
			collectionName,
			'collection.config.json',
		);

		let configContent;
		try {
			configContent = fs.readFileSync(configPath, 'utf-8');
		} catch (_error) {
			let type =
				(_error as any).code === 'ENOENT'
					? ('file-not-found' as const)
					: ('read-file-error' as const);
			Object.assign(_error as any, { collection: collectionName });
			return Err(type, _error as Error & { collection: string });
		}

		let configJSON;
		try {
			configJSON = JSON.parse(configContent);
		} catch (_error) {
			Object.assign(_error as any, { collection: collectionName });
			return Err('json-parse-error', _error as Error & { collection: string });
		}

		const parseResult = collectionConfig
			.transform((value) => {
				return { ...value, name: collectionName };
			})
			.safeParse(configJSON);
		let validatedJSON;
		if (parseResult.success) {
			validatedJSON = parseResult.data;
		} else {
			Object.assign(parseResult.error, { collectionName });
			return Err(
				'user-config-validation-error',
				parseResult.error as typeof parseResult.error & {
					collectionName: string;
				},
			);
		}

		for (const handler of this.onCollectionConfigHandlers) {
			const { filter } = handler.options;
			const collectionTypeMatch =
				filter.collection?.type?.test(validatedJSON.type) ?? true;
			const pathMatch = filter.path?.test(configPath) ?? true;

			if (!collectionTypeMatch || !pathMatch) continue;

			const partialConfig = await handler.callback(validatedJSON);
			const parseResult = pluginCollectionConfig.safeParse(partialConfig);
			if (parseResult.success) {
				mergeInto(validatedJSON, parseResult.data);
			} else {
				Object.assign(parseResult.error, { pluginName: handler.name });
				return Err(
					'plugin-config-validation-error',
					parseResult.error as typeof parseResult.error & {
						pluginName: string;
					},
				);
			}
		}

		return Ok(validatedJSON satisfies CollectionConfig);
	}

	onLoad(
		options: OnLoadHandler['options'],
		callback: OnLoadHandler['callback'],
	): void {
		this.onLoadHandlers.push({ name: this.plugin.name, options, callback });
	}

	async loadFile(
		path: string,
		collectionType: string,
	): Promise<OnLoadResult | null> {
		for (const handler of this.onLoadHandlers) {
			const { filter } = handler.options;
			const collectionTypeMatch =
				filter.collection?.type?.test(collectionType) ?? true;
			const pathMatch = filter.path?.test(path) ?? true;

			if (collectionTypeMatch && pathMatch) {
				return await handler.callback({
					path,
					collection: { type: collectionType },
				});
			}
		}
		return null;
	}
}

/**
 * Checks for "plain old Javascript object", typically made as an object
 * literal. Excludes Arrays and built-in types like Buffer.
 */
function isPlainObject(x: unknown): x is object {
	return typeof x === 'object' && x?.constructor === Object;
}

/**
 * Merge b into a, recursively, mutating a.
 */
export function mergeInto(a: Record<string, any>, b: Record<string, any>) {
	for (const prop in b) {
		if (isPlainObject(b[prop])) {
			if (!isPlainObject(a[prop])) {
				a[prop] = {};
			}
			mergeInto(a[prop], b[prop]);
		} else if (Array.isArray(b[prop])) {
			if (!Array.isArray(a[prop])) {
				a[prop] = [];
			}
			a[prop].push(...b[prop]);
		} else {
			a[prop] = b[prop];
		}
	}

	return a;
}
