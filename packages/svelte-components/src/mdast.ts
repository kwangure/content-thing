import type { HighlightResult } from '@svelte-thing/components/code';
import type { LineInterval } from '@svelte-thing/components/creators';

declare module 'mdast' {
	interface HeadingData {
		value: string;
		id: string;
	}
	interface InlineCodeData {
		attributes: {
			lang?: string;
		};
	}
	interface CodeData {
		attributes: {
			copy?: string;
		};
		copy?: {
			ranges: LineInterval[];
			text: string;
		};
		highlightedLines?: HighlightResult[][];
	}
}
