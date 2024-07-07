import { visit } from 'unist-util-visit';
import { toMarkdown } from 'mdast-util-to-markdown';
import type { Root } from 'mdast';

export interface TocEntry {
	value: string;
	id: string;
	hash: string;
	depth: 1 | 2 | 3;
	children: TocEntry[];
}

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
