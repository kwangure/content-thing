import 'mdast';

declare module 'mdast' {
	interface CodeData {
		attributes: {
			[x: string]: unknown;
		};
	}
	interface InlineCodeData {
		attributes: {
			[x: string]: unknown;
		};
	}
}
