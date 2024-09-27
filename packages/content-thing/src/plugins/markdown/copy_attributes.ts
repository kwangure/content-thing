import {
	parseRanges,
	selectLines,
	type LineInterval,
} from '@content-thing/line-range';
import type { Code, Root } from 'mdast';
import { visit } from 'unist-util-visit';

export function processCopyAttributes(tree: Root) {
	const codeBlocks: Code[] = [];
	visit(tree, (node) => {
		if (node.type === 'code') {
			codeBlocks.push(node);
		}
	});

	for (const node of codeBlocks) {
		// eslint-disable-next-line no-unsafe-optional-chaining
		if (node.data?.attributes && 'copy' in node.data?.attributes) {
			node.data.attributes.copy = true;
			const lines = node.value.split(/\r\n|\r|\n/);
			const lineCount = lines.length;

			let copyRange: LineInterval[] = [[1, lineCount]];
			if (node.data?.attributes.copyRange) {
				copyRange = parseRanges(node.data.attributes.copyRange, lineCount);
			}

			const selectedLines = selectLines(lines, copyRange);
			node.data.copy = {
				ranges: copyRange,
				text: selectedLines.join('\n'),
			};
		}
	}
}
