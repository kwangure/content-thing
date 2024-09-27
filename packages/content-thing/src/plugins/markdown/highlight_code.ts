import {
	getHighlighter,
	isSupportedLanguage,
	type Highlighter,
} from '@content-thing/syntax-highlighter';
import { plaintext } from '@content-thing/syntax-highlighter/syntax/plaintext';
import type { Code, InlineCode, InlineCodeData, Root } from 'mdast';
import { visit } from 'unist-util-visit';

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
	const codeBlocks: InlineCodeWithData[] = [];
	visit(tree, (node) => {
		if (node.type === 'inlineCode') {
			codeBlocks.push(ensureNodeHasData(node));
		}
	});

	const highlighterCache = new Map<string | undefined | null, Highlighter>();
	const promises = codeBlocks.map(async (node) => {
		const lang = node.data?.attributes.lang;
		let highlighter = highlighterCache.get(lang);
		if (!highlighter) {
			if (isSupportedLanguage(lang)) {
				highlighter = await getHighlighter(lang);
				highlighterCache.set(lang, highlighter);
			} else {
				highlighter = plaintext;
			}
		}
		if (node.type === 'inlineCode') {
			node.data.highlightedTokens = highlighter(node.value);
		}
	});
	await Promise.all(promises);
}
