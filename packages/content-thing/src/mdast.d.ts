import 'mdast';

declare module 'mdast' {
	interface RootData {
		frontmatter: any;
	}
}
