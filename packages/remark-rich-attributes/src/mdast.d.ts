import 'mdast';

declare module 'mdast' {
	interface CodeData {
		attributes: {
			file?: string;
		};
	}
}
