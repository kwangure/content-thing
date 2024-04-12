import type { Code, InlineCode, Root } from 'mdast';
import { EOL } from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';

export function processFileAttributes(tree: Root, importer: string) {
	const codeBlocks: (Code | InlineCode)[] = [];
	visit(tree, (node) => {
		if (node.type !== 'code' && node.type !== 'inlineCode') return;
		codeBlocks.push(node);
	});

	const dirname = path.dirname(importer);
	for (const node of codeBlocks) {
		if (!node.data?.attributes.file) continue;

		let { filepath, start, end } = parseFileMeta(node.data.attributes.file);
		delete node.data.attributes.file;

		if (filepath[0] !== '/' && dirname) {
			filepath = path.join(dirname, filepath);
		}

		try {
			const content = fs.readFileSync(filepath, 'utf-8');
			node.value = extractLines(content, start, end);
		} catch (_error) {
			// TODO: Use result type
			console.error(_error);
		}
	}
}

// Regular expression to match the filepath and optional line numbers
const FILEPATH_RE = /^(.*?)(?:#L(-?\d+)?(?:::(-?\d+))?)?$/;
export function parseFileMeta(meta: string) {
	const result: { filepath: string; start?: number; end?: number } = {
		filepath: meta,
	};
	const match = meta.match(FILEPATH_RE);
	// For TypeScript. This should not happen with the provided regex and expected inputs.
	if (!match) return result;

	if (match[1]) result.filepath = match[1];
	if (match[2]) result.start = Number(match[2]);
	if (match[3]) result.end = Number(match[3]);

	return result;
}

/**
 * @param {string} content
 * @param {number} [start]
 * @param {number} [end]
 */
export function extractLines(content: string, start?: number, end?: number) {
	const lines = content.split(EOL);
	if (typeof start !== 'number') {
		start = 1;
	}
	if (typeof end !== 'number') {
		end = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
	}

	return lines.slice(start < 0 ? start : start - 1, end).join('\n');
}
