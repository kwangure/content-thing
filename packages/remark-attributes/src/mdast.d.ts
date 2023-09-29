import 'mdast';

declare module 'mdast' {
	interface CodeData {
		attributes: {
			[x: string]: any;
		};
	}
	interface InlineCodeData {
		attributes: {
			[x: string]: any;
		};
	}
}
