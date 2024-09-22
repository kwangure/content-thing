import type { Asset } from '../../core/graph.js';
import type { Plugin } from '../../core/plugin.js';
import fs from 'node:fs';
import path from 'node:path';
import { getHeadingTree } from './heading_tree.js';
import { isSearchBundle } from '../search/node.js';
import { mergeInto } from '../../utils/object.js';
import { parseFilepath } from '../../utils/filepath.js';
import { parseMarkdownSections } from './parse.js';
import { walk } from '@content-thing/internal-utils/filesystem';

export { mdastToString } from './mdastToString.js';

interface ReadmeAsset extends Asset {
	value: string;
}

interface CollectionConfigAsset extends Asset {
	value: {
		type: 'markdown';
		[key: string]: unknown;
	};
}

export const markdownPlugin: Plugin = {
	name: 'content-thing-markdown',
	bundle(build) {
		build.loadId({
			filter(id): id is string {
				return /(?:^|[/\\])readme\.md$/i.test(id);
			},
			callback({ id }) {
				const value = fs.readFileSync(id, 'utf-8');
				return { value };
			},
		});

		build.transformAsset({
			filter(asset): asset is CollectionConfigAsset {
				return (
					/[/\\]([^/\\]+)[/\\]collection\.config\.json$/.test(asset.id) &&
					typeof asset.value === 'object' &&
					asset.value !== null &&
					'type' in asset.value &&
					asset.value.type === 'markdown'
				);
			},
			callback({ asset }) {
				mergeInto(asset.value, {
					data: {
						fields: {
							_id: {
								type: 'string',
							},
							_headingTree: {
								type: 'json',
								jsDocType: "import('content-thing').TocEntry[]",
							},
							_content: {
								type: 'json',
								jsDocType: "import('content-thing/mdast').Root",
							},
						},
					},
				});

				return asset;
			},
		});

		build.transformAsset({
			filter(asset): asset is ReadmeAsset {
				return (
					/(?:^|[/\\])readme\.md$/i.test(asset.id) &&
					typeof asset.value === 'string'
				);
			},
			async callback({ asset }) {
				const { entry } = parseFilepath(asset.id);
				const { frontmatter, content } = await parseMarkdownSections(
					asset.value,
					asset.id,
				);
				const tableOfContents = getHeadingTree(content);

				Object.assign(asset, {
					value: {
						record: {
							...frontmatter,
							_content: content,
							_id: entry.id,
							_headingTree: tableOfContents,
						},
					},
				});

				return asset;
			},
		});

		build.loadDependencies({
			filter(asset): asset is CollectionConfigAsset {
				return (
					/[/\\]([^/\\]+)[/\\]collection\.config\.json$/.test(asset.id) &&
					typeof asset.value === 'object' &&
					asset.value !== null &&
					'type' in asset.value &&
					asset.value.type === 'markdown'
				);
			},
			callback({ asset }) {
				const collectionDir = path.dirname(asset.id);
				const markdownEntries: string[] = [];
				walk(collectionDir, (dirent) => {
					if (/(?:^|[/\\])readme\.md$/i.test(dirent.name) && dirent.isFile()) {
						markdownEntries.push(path.join(dirent.path, dirent.name));
					}
				});

				return markdownEntries;
			},
		});

		build.transformBundle({
			filter: isSearchBundle,
			callback({ bundle }) {
				for (const [field, serializer] of bundle.meta.fields) {
					if (field === '_content') {
						serializer.imports = new Map([
							[
								'content-thing',
								{
									namedImports: ['mdastToString'],
								},
							],
						]);
						serializer.serializer = 'mdastToString';
					}
				}

				return bundle;
			},
		});
	},
};
