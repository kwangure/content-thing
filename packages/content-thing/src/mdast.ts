import 'mdast';

declare module 'mdast' {
	interface HeadingData {
		value: string;
		id: string;
		hash: string;
	}
	interface RootData {
		frontmatter: any;
	}
}
