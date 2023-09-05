import { visit } from 'unist-util-visit';

const LEADING_DASH_RE = /^-+/;
const LEADING_HASH_RE = /^#+\s*/;
const NON_ALPHA_NUMERIC_RE = /[^a-z0-9]+/g;
const TRAILING_DASH_RE = /-+$/;

/**
 * @this {import('unified').Processor}
 * @type {import('unified').Plugin<void[], import('mdast').Root, import('mdast').Root>}
 */
export function remarkTableOfContents() {
	return (tree, vfile) => {
		/** @type {{ children: import('./types.js').TocEntry[] }} */
		const dummyRoot = { children: [] };
		const stack = [dummyRoot];

		visit(tree, 'heading', (node) => {
			if (node.depth !== 1 && node.depth !== 2 && node.depth !== 3) return;

			const mdString = /** @type {string} */ (this.stringify(node));
			const content =
				/** @type {string} */ (node.data?.value) ||
				mdString.replace(LEADING_HASH_RE, '');
			const id =
				/** @type {string} */ (node.data?.id) ||
				content
					.toLowerCase()
					.replace(NON_ALPHA_NUMERIC_RE, '-')
					.replace(LEADING_DASH_RE, '')
					.replace(TRAILING_DASH_RE, '');

			/** @type {import('./types.js').TocEntry} */
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
}

export default remarkTableOfContents;
