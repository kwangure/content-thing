import 'mdast';

declare module 'mdast' {
	interface CodeData {
		attributes: {
			file?: string;
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
		};
	}
	interface RootData {
		frontmatter: any;
	}
}
