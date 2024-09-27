import type { Plugin, ResolvedConfig } from 'vite';
import {
	getHighlighter,
	highlightLines,
	isSupportedLanguage,
} from '@content-thing/syntax-highlighter';
import { parseRanges, selectLines } from '@content-thing/line-range';
import fs from 'node:fs';

const EXTENSION_REGEX = /\.([^/.?#]+)(?=\?|#|$)/;
const HIGHLIGHT_REGEX = /(\?|&)highlight(?:&|$)/;
const LINES_REGEX = /(\?|&)lines(?:&|$)/;
const NEW_LINE_REGEX = /\r\n|\r|\n/;
const RANGE_REGEX = /(\?|&)range=([\d,-]+)(?:&|$)/;
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
		async resolveId(id, importer, options) {
			if (id.match(RANGE_REGEX)) {
				const [path, query] = id.split('?');
				const resolution = await this.resolve(path, importer, options);
				if (resolution) {
					return resolution.id + '?' + query;
				}
			}
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

			let code = fs.readFileSync(cleanUrl(id), 'utf-8');

			const rangeMatch = id.match(RANGE_REGEX);
			if (rangeMatch) {
				const lines = code.split(NEW_LINE_REGEX);
				const rangeString = rangeMatch[2];
				const ranges = parseRanges(rangeString, lines.length);
				code = selectLines(lines, ranges).join('\n');
			}

			const highlighter = await getHighlighter(extension);
			const highlightResult = LINES_REGEX.test(id)
				? highlightLines(code, highlighter)
				: highlighter(code);
			const json = JSON.stringify(JSON.stringify(highlightResult));
			return `const tokens = JSON.parse(${json});\nexport default tokens;\n`;
		},
	} satisfies Plugin;
}
