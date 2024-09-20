import type { Plugin } from '../../core/plugin.js';
import type { SearchMeta } from '../search/node.js';
import fs from 'node:fs';
import path from 'node:path';
import { getHeadingTree } from './heading_tree.js';
import { mergeInto } from '../../utils/object.js';
import { parseFilepath } from '../../utils/filepath.js';
import { parseMarkdownSections } from './parse.js';
import { walk } from '@content-thing/internal-utils/filesystem';

export { mdastToString } from './mdastToString.js';

const README_REGEXP = /(?:^|[/\\])readme\.md$/i;
const COLLECTION_CONFIG_REGEXP = /[/\\]([^/\\]+)[/\\]collection\.config\.json$/;

export const markdownPlugin: Plugin = {
	name: 'content-thing-markdown',
	bundle(build) {
		build.loadId({ filter: README_REGEXP }, (id) => {
			const value = fs.readFileSync(id, 'utf-8');
			return { value };
		});

		build.transformAsset({ filter: COLLECTION_CONFIG_REGEXP }, (asset) => {
			if (
				typeof asset.value !== 'object' ||
				asset.value === null ||
				!('type' in asset.value) ||
				asset.value.type !== 'markdown'
			)
				return asset;

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
		});

		build.transformAsset({ filter: README_REGEXP }, async (asset) => {
			if (typeof asset.value !== 'string') return asset;

			const { entry } = parseFilepath(asset.id);
			const { frontmatter, content } = await parseMarkdownSections(
				asset.value,
				asset.id,
			);
			const tableOfContents = getHeadingTree(content);

			asset.value = {
				record: {
					...frontmatter,
					_content: content,
					_id: entry.id,
					_headingTree: tableOfContents,
				},
			};

			return asset;
		});

		build.loadDependencies(
			{ filter: COLLECTION_CONFIG_REGEXP },
			({ id, value }) => {
				if (
					typeof value !== 'object' ||
					value === null ||
					!('type' in value) ||
					value.type !== 'markdown'
				)
					return [];

				const collectionDir = path.dirname(id);
				const markdownEntries: string[] = [];
				walk(collectionDir, (dirent) => {
					if (dirent.name.match(README_REGEXP) && dirent.isFile()) {
						markdownEntries.push(path.join(dirent.path, dirent.name));
					}
				});

				return markdownEntries;
			},
		);

		build.transformBundle(({ bundle }) => {
			if (!bundle.id.endsWith('collection-search')) return bundle;

			const { fields } = bundle.meta as SearchMeta;
			for (const [field, serializer] of fields) {
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
		});
	},
};
