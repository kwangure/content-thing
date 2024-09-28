import type {
	CollectionConfig,
	CollectionConfigFields,
} from '../config/types.js';
import type { Logger } from 'vite';
import type { ValidatedContentThingOptions } from '../config/options.js';
import { Err, Ok } from '../utils/result.js';
import { PluginDriver, type Plugin } from './plugin.js';
import fs from 'node:fs';
import path from 'node:path';

export interface CollectionItem {
	readonly data: Record<string, unknown>;
	readonly content?: string;
}

interface CollectionConfigMeta {
	config: CollectionConfig;
	resolvedFilepaths: Set<string>;
	items: Map<string, CollectionItem>;
}

export class AssetGraph {
	#collectionConfigs = new Map<string, CollectionConfigMeta>();
	#options;
	#logger;
	#pluginDriver;

	constructor(
		options: ValidatedContentThingOptions,
		plugins: Plugin[],
		logger: Logger,
	) {
		this.#logger = logger;
		this.#options = options;
		this.#pluginDriver = new PluginDriver(plugins);
	}

	async #loadCollectionConfigs() {
		const { collectionsDir } = this.#options.files;
		if (!fs.existsSync(collectionsDir)) return;

		const dirents = fs.readdirSync(collectionsDir, { withFileTypes: true });
		const configFilepaths = [];
		for (const entry of dirents) {
			if (!entry.isDirectory()) continue;

			const configPath = path.join(
				entry.path,
				entry.name,
				'collection.config.json',
			);
			if (fs.existsSync(configPath)) {
				configFilepaths.push(configPath);
			}
		}

		for (const filepath of configFilepaths) {
			const loadResult =
				await this.#pluginDriver.loadCollectionConfig(filepath);
			if (loadResult.ok) {
				this.#collectionConfigs.set(filepath, {
					config: loadResult.value,
					resolvedFilepaths: new Set(),
					items: new Map(),
				});
			} else {
				this.#logger.error(loadResult.meta.message);
			}
		}
	}

	async #transformCollectionConfigs() {
		for (const { config } of this.#collectionConfigs.values()) {
			const transformResult =
				await this.#pluginDriver.transformCollectionConfig(config);
			if (!transformResult.ok) {
				this.#logger.error(transformResult.meta.message);
			}
		}
	}

	async #writeCollectionConfigs() {
		for (const { config } of this.#collectionConfigs.values()) {
			await this.#pluginDriver.writeCollectionConfig({
				config,
				options: this.#options,
			});
		}
	}

	async #resolveCollectionItems() {
		const resolvePromises = [];
		for (const configMeta of this.#collectionConfigs.values()) {
			resolvePromises.push(
				(async () => {
					const filepaths = await this.#pluginDriver.resolveCollectionItems({
						config: configMeta.config,
						options: this.#options,
					});
					configMeta.resolvedFilepaths = new Set(filepaths);
				})(),
			);
		}
		await Promise.allSettled(resolvePromises);
	}

	async #loadCollectionItems() {
		const loadPromises = [];
		for (const configMeta of this.#collectionConfigs.values()) {
			const { config, items, resolvedFilepaths } = configMeta;
			for (const filepath of resolvedFilepaths) {
				loadPromises.push(
					(async () => {
						const itemResult = await this.#pluginDriver.loadCollectionItem({
							config,
							filepath,
							options: this.#options,
						});
						if (!itemResult.ok) {
							this.#logger.error(
								typeof itemResult.meta === 'string'
									? itemResult.meta
									: itemResult.meta.message,
							);
							return;
						}

						const validateItemResult = validateCollectionItem(
							config.fields,
							itemResult.value,
						);
						if (!validateItemResult.ok) {
							let message = `Schema validation of file at ${JSON.stringify(filepath)} failed. `;
							if (validateItemResult.type === 'missing-value') {
								const { name, type } = validateItemResult.meta;
								message += `Field ${JSON.stringify(name)} is missing value. Provide a value of type "${type}" or set the field schema as nullable.`;
							} else if (validateItemResult.type === 'type-mismatch') {
								const { expected, found, name, value } =
									validateItemResult.meta;
								message += `Invalid field ${JSON.stringify(name)} of type "${found}" found. Expect ${expected} but found ${JSON.stringify(value)} instead.`;
							} else if (validateItemResult.type === 'unknown-field') {
								const { expected, name } = validateItemResult.meta;
								message += `Unknown field ${JSON.stringify(name)}.`;
								if (expected.length) {
									message += ` Expected one of: "${expected.join('", "')}"`;
								}
							} else {
								/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
								const exhaustiveCheck: never = validateItemResult;
							}
							this.#logger.error(message);
							return;
						}
						items.set(filepath, itemResult.value);
					})(),
				);
			}
		}
		await Promise.allSettled(loadPromises);
	}

	async #writeCollectionItems() {
		const writePromises = [];
		for (const { config, items } of this.#collectionConfigs.values()) {
			for (const [filepath, item] of items) {
				writePromises.push(
					this.#pluginDriver.writeCollectionItem({
						config,
						options: this.#options,
						filepath,
						...item,
					}),
				);
			}
		}
		await Promise.allSettled(writePromises);
	}

	async bundle() {
		this.#pluginDriver.initialize();
		await this.#loadCollectionConfigs();
		await this.#transformCollectionConfigs();
		await this.#writeCollectionConfigs();
		await this.#resolveCollectionItems();
		await this.#loadCollectionItems();
		await this.#writeCollectionItems();
	}

	reset() {
		this.#collectionConfigs.clear();
	}
}

const fieldTypes = {
	json: 'object',
	number: 'number',
	string: 'string',
} as const;

function validateCollectionItem(
	fields: CollectionConfigFields,
	item: CollectionItem,
) {
	const entries = new Map(Object.entries(fields));
	const fieldNames = Object.keys(fields);
	for (const [fieldName, fieldValue] of Object.entries(item.data)) {
		const fieldSchema = entries.get(fieldName);
		if (!fieldSchema) {
			return Err('unknown-field', { expected: fieldNames, name: fieldName });
		}

		if (fieldValue === null || fieldValue === undefined) {
			if (!fieldSchema.nullable) {
				return Err('missing-value', {
					name: fieldName,
					type: fieldSchema.type,
				});
			}
		} else {
			const expected = fieldTypes[fieldSchema.type];
			if (typeof fieldValue !== expected) {
				return Err('type-mismatch', {
					expected,
					found: typeof fieldValue,
					name: fieldName,
					value: fieldValue,
				});
			}
		}
	}

	return Ok();
}
