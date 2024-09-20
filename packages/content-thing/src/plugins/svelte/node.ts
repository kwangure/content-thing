import type { CollectionConfig } from '../../config/types.js';
import type { Plugin } from '../../core/plugin.js';
import type { ValidatedContentThingOptions } from '../../config/options.js';
import type { Root } from 'mdast';
import path from 'node:path';
import { write } from '@content-thing/internal-utils/filesystem';
import { mdastToSvelteString } from './mdastToSvelteString.js';
import { cwd } from 'node:process';

const README_REGEXP = /(?<=^|[/\\])readme\.md$/i;
const SVELTE_REGEXP = /(?<=^|[/\\])readme\.md\.svelte$/i;
const COLLECTION_CONFIG_REGEXP = /[/\\]([^/\\]+)[/\\]collection\.config\.json$/;

function escapeRegExp(text: string) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
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

		build.loadDependencies({ filter: README_REGEXP }, ({ id, value }) => {
			if (
				typeof value === 'object' &&
				value !== null &&
				'record' in value &&
				typeof value['record'] === 'object'
			) {
				return [`${id}.svelte`];
			}

			return [];
		});

		build.loadId({ filter: SVELTE_REGEXP }, (id, graph) => {
			const mdId = id.replace(/.svelte$/, '');
			const mdAsset = graph.getAsset(mdId);
			const svelteContent = (mdAsset?.value as { record: { _content: Root } })
				.record._content;

			return { value: mdastToSvelteString(svelteContent) };
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

		build.transformBundle(({ bundle, graph }) => {
			if (!bundle.id.endsWith('-svelte')) return bundle;

			const { collectionConfig } = bundle.meta as {
				collectionConfig: CollectionConfig;
			};
			const collectionAssets = graph.getDependencies(collectionConfig.filepath);
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
		});

		build.writeBundle((bundle) => {
			if (!bundle.id.endsWith('-svelte')) return;

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
		});
	},
};
