import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root } from 'mdast';
import type { TocEntry } from './types';

const LEADING_DASH_RE = /^-+/;
const LEADING_HASH_RE = /^#+\s*/;
const NON_ALPHA_NUMERIC_RE = /[^a-z0-9]+/g;
const TRAILING_DASH_RE = /-+$/;

export const remarkTableOfContents: Plugin<void[], Root> = function () {
	return (tree, vfile) => {
		const dummyRoot: { children: TocEntry[] } = { children: [] };
		const stack = [dummyRoot];

		visit(tree, 'heading', (node) => {
			if (node.depth !== 1 && node.depth !== 2 && node.depth !== 3) return;

			const mdString = this?.stringify(node) as string;
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

		vfile.data = {
			...vfile.data,
			tableOfContents: dummyRoot.children,
		};
	};
};

export default remarkTableOfContents;
