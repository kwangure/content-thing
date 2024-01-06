import type { TocEntry } from './types';

import 'mdast';

declare module 'mdast' {
	interface HeadingData {
		value: string;
		id: string;
		hash: string;
	}
	interface RootData {
		tableOfContents?: TocEntry[];
		frontmatter?: any;
	}
}
