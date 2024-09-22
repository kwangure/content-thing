import type { Asset, Bundle } from '../../core/graph.js';
import type { CollectionConfig } from '../../config/types.js';
import type { Plugin } from '../../core/plugin.js';
import type { ValidatedContentThingOptions } from '../../config/options.js';
import type { Root } from 'mdast';
import { cwd } from 'node:process';
import { mdastToSvelteString } from './mdastToSvelteString.js';
import { write } from '@content-thing/internal-utils/filesystem';
import path from 'node:path';

const README_REGEXP = /(?<=^|[/\\])readme\.md$/i;
const SVELTE_REGEXP = /(?<=^|[/\\])readme\.md\.svelte$/i;
const COLLECTION_CONFIG_REGEXP = /[/\\]([^/\\]+)[/\\]collection\.config\.json$/;

function escapeRegExp(text: string) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

interface ReadmeAsset extends Asset {
	value: {
		record: {
			_content: Root;
		};
	};
}

interface SvelteBundle extends Bundle {
	meta: {
		collectionConfig: CollectionConfig;
	};
}

export const sveltePlugin: Plugin = {
	name: 'content-thing-svelte',
	bundle(build) {
		const COLLECTIONS_ROOT_RE = new RegExp(
			`^${escapeRegExp(cwd())}[\\/\\\\]src[\\/\\\\]collections`,
		);
		let validatedOptions: ValidatedContentThingOptions;

		build.configResolved((_config) => {
			validatedOptions = _config;
		});

		build.loadDependencies({
			filter: (asset: Asset): asset is ReadmeAsset => {
				return (
					README_REGEXP.test(asset.id) &&
					typeof asset.value === 'object' &&
					asset.value !== null &&
					'record' in asset.value &&
					typeof asset.value.record === 'object'
				);
			},
			callback: ({ id }) => {
				return [`${id}.svelte`];
			},
		});

		build.loadId({
			filter: (id: string): id is string => SVELTE_REGEXP.test(id),
			callback: (id, graph) => {
				const mdId = id.replace(/.svelte$/, '');
				const mdAsset = graph.getAsset(mdId) as ReadmeAsset | undefined;
				if (!mdAsset) throw new Error(`Markdown asset not found for ${id}`);
				const svelteContent = mdAsset.value.record._content;

				return { value: mdastToSvelteString(svelteContent) };
			},
		});

		build.createBundle((graph) => {
			const { assets } = graph;
			const bundleConfigs = [];
			for (const asset of assets) {
				const match = asset.id.match(COLLECTION_CONFIG_REGEXP);
				if (!match) continue;
				bundleConfigs.push({
					id: `${match[1]}-svelte`,
					meta: {
						collectionConfig: asset.value,
					},
				});
			}
			return bundleConfigs;
		});

		const isSvelteBundle = (bundle: Bundle): bundle is SvelteBundle => {
			return bundle.id.endsWith('-svelte');
		};

		build.transformBundle({
			filter: isSvelteBundle,
			callback: ({ bundle, graph }) => {
				const { collectionConfig } = bundle.meta;
				const collectionAssets = graph.getDependencies(
					collectionConfig.filepath,
				);
				for (const asset of collectionAssets) {
					if (!README_REGEXP.test(asset.id)) continue;
					const readmeAssets = asset.dependencies;
					for (const asset of readmeAssets) {
						if (SVELTE_REGEXP.test(asset.id)) {
							bundle.addAsset(asset);
						}
					}
				}

				return bundle;
			},
		});

		build.writeBundle({
			filter: isSvelteBundle,
			callback: (bundle) => {
				for (const asset of bundle.assets) {
					const baseFilePath = asset.id
						.replace(COLLECTIONS_ROOT_RE, '')
						.replace(SVELTE_REGEXP, '+page.svelte');
					const outputFilepath = path.join(
						validatedOptions.files.collectionsMirrorDir,
						baseFilePath,
					);
					write(outputFilepath, asset.value as string);
				}
			},
		});
	},
};
