import fs from 'node:fs/promises';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import { remarkYamlParse } from '@content-thing/remark-yaml-parse';
import { remarkAttributes } from '@content-thing/remark-attributes';
import { remarkRichAttributes } from '@content-thing/remark-rich-attributes';
import { remarkVariables } from '@content-thing/remark-variables';
import type { CollectionPlugin, OnLoadResult } from './types.js';
import { visit } from 'unist-util-visit';
import { toMarkdown } from 'mdast-util-to-markdown';
import type { Root } from 'mdast';
import type { TocEntry } from '../types.js';
import { parseFilepath } from './util.js';

export const markdownPlugin: CollectionPlugin = {
	name: 'collection-plugin-markdown',
	setup(build) {
		const processor = unified()
			.use(remarkParse)
			.use(remarkStringify)
			.use(remarkFrontmatter)
			.use(remarkYamlParse)
			.use(remarkAttributes)
			.use(remarkRichAttributes)
			.use(remarkVariables);

		build.onLoad(
			{ filter: { collection: { type: /markdown/ } } },
			async ({ path }) => {
				const { entry } = parseFilepath(path);
				const content = await fs.readFile(path, 'utf-8');
				const tree = processor.parse(content);
				const transformedTree = processor.runSync(tree);
				const tableOfContents = getHeadingTree(transformedTree);
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

const LEADING_DASH_RE = /^-+/;
const LEADING_HASH_RE = /^#+\s*/;
const NON_ALPHA_NUMERIC_RE = /[^a-z0-9]+/g;
const TRAILING_DASH_RE = /-+$/;

export function getHeadingTree(tree: Root) {
	const dummyRoot: { children: TocEntry[] } = { children: [] };
	const stack = [dummyRoot];

	visit(tree, 'heading', (node) => {
		if (node.depth !== 1 && node.depth !== 2 && node.depth !== 3) return;

		const mdString = toMarkdown(node);
		const content =
			(node.data?.value as string) || mdString.replace(LEADING_HASH_RE, '');
		const id =
			node.data?.id ||
			content
				.toLowerCase()
				.replace(NON_ALPHA_NUMERIC_RE, '-')
				.replace(LEADING_DASH_RE, '')
				.replace(TRAILING_DASH_RE, '');

		const tocEntry = {
			depth: node.depth,
			value: content,
			id,
			hash: `#${id}`,
			children: [],
		};
		while (stack.length > tocEntry.depth) {
			stack.pop();
		}
		stack[stack.length - 1].children.push(tocEntry);
		stack.push(tocEntry);

		node.data = {
			...node.data,
			...tocEntry,
		};
	});

	return dummyRoot.children;
}
