import { EOL } from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';

/** @type {import('unified').Plugin<void[], import('mdast').Root>} */
export function remarkRichAttributes() {
	return (tree, vfile) => {
		/** @type {import('mdast').Code[]} */
		const codeBlocks = [];
		visit(tree, 'code', (node) => {
			codeBlocks.push(node);
		});
		for (const node of codeBlocks) {
			if (!node.data) return;
			const file = /** @type {{ file: string | undefined }} */ (
				node.data.attributes
			).file;
			if (!file) continue;

			let { filepath, start, end } = parseFileMeta(file);
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
}

/**
 * @param {string} meta
 */
export function parseFileMeta(meta) {
	const [filepath, lines] = meta.split('#L');

	if (!lines) return { filepath };

	/** @type {number[]} */
	const [start, end = start] = lines.split('-').map(Number);
	return { filepath, start, end };
}

/**
 * @param {string} content
 * @param {number} [start]
 * @param {number} [end]
 */
export function extractLines(content, start, end) {
	const lines = content.split(EOL);
	if (!start) {
		start = 1;
		end = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
	}

	return lines.slice(start - 1, end).join('\n');
}

export default remarkRichAttributes;
