import 'mdast';

declare module 'mdast' {
	interface CodeData {
		attributes: {
			file?: string;
		};
	}
	interface InlineCodeData {
		attributes: {
			file?: string;
		};
	}
}
