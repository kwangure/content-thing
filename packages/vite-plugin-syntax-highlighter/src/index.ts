import type { Plugin, ResolvedConfig } from 'vite';
import {
	getHighlighter,
	highlightLines,
	isSupportedLanguage,
} from '@content-thing/syntax-highlighter';
import fs from 'node:fs';

const EXTENSION_REGEX = /\.([^/.?#]+)(?=\?|#|$)/;
const HIGHLIGHT_REGEX = /(\?|&)highlight(?:&|$)/;
const LINES_REGEX = /(\?|&)lines(?:&|$)/;
const POSTFIX_REGEX = /[?#].*$/;
function cleanUrl(url: string): string {
	return url.replace(POSTFIX_REGEX, '');
}

/**
 * A Vite plugin to highlight code using Lezer.
 */
export function syntaxHighlighter() {
	let vite: ResolvedConfig;
	return {
		// Run before other plugins (e.g. vite-plugin-svelte)
		enforce: 'pre',
		name: '@content-thing/vite-plugin-syntax-highlighter',
		configResolved(server) {
			vite = server;
		},
		async load(id) {
			if (!id.match(HIGHLIGHT_REGEX)) return;

			const match = id.match(EXTENSION_REGEX);
			if (!match || typeof match[1] !== 'string') return;

			const extension = match[1];

			if (!isSupportedLanguage(extension)) {
				const message = `Unable to syntax highlight ${JSON.stringify(id)}. Language "${extension}" is unsupported.`;
				if (vite.command === 'build') {
					throw Error(message);
				} else {
					vite.logger.error(message);
				}
				return;
			}

			const highlighter = await getHighlighter(extension);
			const code = fs.readFileSync(cleanUrl(id), 'utf-8');
			const highlightResult = LINES_REGEX.test(id)
				? highlightLines(code, highlighter)
				: highlighter(code);
			const json = JSON.stringify(JSON.stringify(highlightResult));
			return `const tokens = JSON.parse(${json});\nexport default tokens;\n`;
		},
	} satisfies Plugin;
}
