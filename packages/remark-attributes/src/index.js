import mdAttributes from 'md-attr-parser';
import { visit } from 'unist-util-visit';

const ATTRIBUTE_BLOCK_RE = /^\s*(\{.*?\})/;

/**
 * @this {import('unified').Processor<void, import('mdast').Root>}
 * @type {import('unified').Plugin<void[], import('mdast').Root>}
 */
export function remarkAttributes() {
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
						/** @type {import("mdast").Parent} */ (parent ?? undefined),
					);
					break;
				default:
					break;
			}
		});
	};
}

export default remarkAttributes;

/**
 * @param {import("mdast").Code} code
 */
function parseCode(code) {
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

/**
 * @param {import("mdast").InlineCode} inlineCode
 * @param {number} [index]
 * @param {import("mdast").Parent} [parent]
 */
function parseInlineCode(inlineCode, index, parent) {
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

/**
 * @param {{} | null} value
 */
function isNonEmptyObject(value) {
	return (
		typeof value === 'object' && value !== null && Object.keys(value).length > 0
	);
}
