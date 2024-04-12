import fs from 'node:fs/promises';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import { remarkYamlParse } from '@content-thing/remark-yaml-parse';
import { remarkAttributes } from '@content-thing/remark-attributes';
import { remarkVariables } from '@content-thing/remark-variables';
import type { CollectionPlugin, OnLoadResult } from '../types.js';
import { parseFilepath } from '../../helpers/filepath.js';
import { getHeadingTree } from './heading_tree.js';
import type { Root } from 'mdast';
import { processFileAttributes } from './file_attributes.js';

export const markdownPlugin: CollectionPlugin = {
	name: 'collection-plugin-markdown',
	setup(build) {
		const processor = unified()
			.use(remarkParse)
			.use(remarkStringify)
			.use(remarkFrontmatter)
			.use(remarkYamlParse)
			.use(remarkAttributes)
			.use(remarkVariables);

		build.onLoad(
			{ filter: { collection: { type: /markdown/ } } },
			async ({ path }) => {
				const { entry } = parseFilepath(path);
				const content = await fs.readFile(path, 'utf-8');
				const tree = processor.parse(content);
				const transformedTree = processor.runSync(tree);
				processFileAttributes(transformedTree, path);
				const tableOfContents = getHeadingTree(transformedTree as Root);
				const loadResult: OnLoadResult = {
					record: {
						...transformedTree.data?.frontmatter,
						_content: transformedTree,
						_id: entry.id,
						_headingTree: tableOfContents,
					},
				};

				return loadResult;
			},
		);
	},
};
