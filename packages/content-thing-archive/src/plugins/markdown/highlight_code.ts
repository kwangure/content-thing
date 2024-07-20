import {
	getSupportedHighlighter,
	highlightLines,
	type Highlighter,
} from '@svelte-thing/components/code';
import type { Code, CodeData, InlineCode, InlineCodeData, Root } from 'mdast';
import { visit } from 'unist-util-visit';

interface CodeWithData extends Code {
	data: CodeData;
}

interface InlineCodeWithData extends InlineCode {
	data: InlineCodeData;
}

function ensureNodeHasData<T extends Code | InlineCode>(
	node: T,
): T & { data: NonNullable<T['data']> } {
	if (!node.data) node.data = { attributes: {} };
	return node as T & { data: NonNullable<T['data']> };
}

export async function highlightCodeBlocks(tree: Root) {
	const codeBlocks: (CodeWithData | InlineCodeWithData)[] = [];
	visit(tree, (node) => {
		if (node.type === 'code' || node.type === 'inlineCode') {
			codeBlocks.push(ensureNodeHasData(node));
		}
	});

	const highlighters = new Map<string | undefined | null, Highlighter>();
	const promises = codeBlocks.map(async (node) => {
		const lang = node.type === 'code' ? node.lang : node.data?.attributes.lang;
		if (typeof lang === 'string') {
			let highlighter = highlighters.get(lang);
			if (!highlighter) {
				highlighter = await getSupportedHighlighter(lang);
				highlighters.set(lang, highlighter);
			}
			if (node.type === 'code') {
				node.data.highlightedLines = highlightLines(node.value, highlighter);
			} else {
				node.data.highlightedTokens = highlighter(node.value);
			}
		}
	});
	await Promise.all(promises);
}
