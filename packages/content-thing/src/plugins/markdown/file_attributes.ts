import {
	parseRanges,
	selectLines,
	type LineInterval,
} from '@content-thing/line-range';
import type { InlineCode, Root } from 'mdast';
import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';

export function processFileAttributes(tree: Root, importer: string) {
	const codeBlocks: InlineCode[] = [];
	visit(tree, (node) => {
		if (node.type === 'inlineCode') {
			codeBlocks.push(node);
		}
	});

	const dirname = path.dirname(importer);
	for (const node of codeBlocks) {
		if (!node.data?.attributes.file) continue;

		let filepath = node.data?.attributes.file;
		if (filepath[0] !== '/' && dirname) {
			filepath = path.join(dirname, filepath);
		}
		const content = fs.readFileSync(filepath, 'utf-8');
		const lines = content.split(/\r\n|\r|\n/);
		const lineCount = lines.length;

		let fileRange: LineInterval[] = [[1, lineCount]];
		if (node.data?.attributes.fileRange) {
			fileRange = parseRanges(node.data.attributes.fileRange, lineCount);
		}

		const selectedLines = selectLines(lines, fileRange);
		node.value = selectedLines.join('\n');
	}
}
