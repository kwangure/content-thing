import mdAttributes from 'md-attr-parser';
import type { Code, InlineCode, Parent, Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

const ATTRIBUTE_BLOCK_RE = /^\s*(\{.*?\})/;

export const remarkAttributes: Plugin<void[], Root> = () => {
	return (tree) => {
		visit(tree, (node, index, parent) => {
			switch (node.type) {
				case 'code':
					parseCode(node);
					break;
				case 'inlineCode':
					parseInlineCode(
						node,
						index ?? undefined,
						/** @type {import("mdast").Parent} */ parent ?? undefined,
					);
					break;
				default:
					break;
			}
		});
	};
};

export default remarkAttributes;

function parseCode(code: Code) {
	code.data = {
		...code.data,
		attributes: {},
	};
	if (!code.meta) return;

	const match = code.meta.match(ATTRIBUTE_BLOCK_RE);
	if (!match) return;

	const parseOutput = mdAttributes(match[1].trim());
	if (!isNonEmptyObject(parseOutput.prop)) return;

	code.data.attributes = parseOutput.prop;
	code.meta = code.meta.replace(match[0].trimEnd(), '');
}

function parseInlineCode(
	inlineCode: InlineCode,
	index?: number,
	parent?: Parent,
) {
	inlineCode.data = {
		...inlineCode.data,
		attributes: {},
	};
	if (typeof index !== 'number' || !parent) return;

	const nextSibling = parent.children[index + 1];
	if (nextSibling?.type !== 'text') return;

	const match = nextSibling.value.match(ATTRIBUTE_BLOCK_RE);
	if (!match) return;

	const parseOutput = mdAttributes(match[1].trim());
	if (!isNonEmptyObject(parseOutput.prop)) return;

	(inlineCode.data.attributes = parseOutput.prop),
		(nextSibling.value = nextSibling.value.replace(match[0].trimEnd(), ''));
}

function isNonEmptyObject(value: {} | null) {
	return (
		typeof value === 'object' && value !== null && Object.keys(value).length > 0
	);
}
