import type { HighlightResult } from '@svelte-thing/components/code';
import type { LineInterval } from './util.js';

declare module 'mdast' {
	interface CodeData {
		attributes: {
			copy?: boolean | string;
			copyRange?: string;
			file?: string;
			fileRange?: string;
		};
		copy?: {
			ranges: LineInterval[];
			text: string;
		};
		highlightedLines?: HighlightResult[][];
	}
	interface HeadingData {
		value: string;
		id: string;
		hash: string;
	}
	interface InlineCodeData {
		attributes: {
			file?: string;
			fileRange?: string;
			lang?: string;
		};
		highlightedTokens?: HighlightResult[];
	}
	interface RootData {
		frontmatter: unknown;
	}
}
