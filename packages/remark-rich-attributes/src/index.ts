import type { Code, InlineCode, Root } from 'mdast';
import type { Plugin } from 'unified';
import { EOL } from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';

export const remarkRichAttributes: Plugin<void[], Root> = () => {
	return (tree, vfile) => {
		const codeBlocks: (Code | InlineCode)[] = [];
		visit(tree, (node) => {
			if (node.type !== 'code' && node.type !== 'inlineCode') return;
			codeBlocks.push(node);
		});
		for (const node of codeBlocks) {
			if (!node.data?.attributes.file) continue;

			let { filepath, start, end } = parseFileMeta(node.data.attributes.file);
			const { dirname } = vfile;

			if (filepath[0] !== '/' && dirname) {
				filepath = path.join(dirname, filepath);
			}

			try {
				const content = fs.readFileSync(filepath, 'utf-8');
				node.value = extractLines(content, start, end);
			} catch (_error) {
				// TODO: Add to vfile
				console.error(_error);
			}
		}
	};
};

export function parseFileMeta(meta: string) {
	const [filepath, lines] = meta.split('#L');

	if (!lines) return { filepath };

	const [start, end = start]: number[] = lines.split('-').map(Number);
	return { filepath, start, end };
}

/**
 * @param {string} content
 * @param {number} [start]
 * @param {number} [end]
 */
export function extractLines(content: string, start?: number, end?: number) {
	const lines = content.split(EOL);
	if (!start) {
		start = 1;
		end = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
	}

	return lines.slice(start - 1, end).join('\n');
}

export default remarkRichAttributes;
