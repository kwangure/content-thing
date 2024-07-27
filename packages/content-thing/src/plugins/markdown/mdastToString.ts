import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

const nodeTypesWithPeriod = [
	'paragraph',
	'heading',
	'blockquote',
	'listItem',
	'tableCell',
];

function nodeNeedsPeriod(
	node?: { type: string; children: unknown[] } | undefined,
	childIndex?: number,
) {
	return (
		node &&
		nodeTypesWithPeriod.includes(node.type) &&
		childIndex === node.children.length - 1
	);
}

export function mdastToString(root: Root): string {
	const values: string[] = [];
	visit(root, (node, index, parent) => {
		if (!('value' in node)) return;
		let value = node.value;
		if (nodeNeedsPeriod(parent, index) && value.trimEnd().at(-1) !== '.') {
			value = value.trimEnd() + '. ';
		}
		values.push(value);
	});
	return values.join('');
}
