import type { HighlightResult } from '@content-thing/syntax-highlighter';
import type { LineInterval } from '@content-thing/line-range';

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

export * from 'mdast';
