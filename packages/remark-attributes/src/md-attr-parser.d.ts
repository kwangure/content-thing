declare module 'md-attr-parser' {
	interface ParseConfig {
		defaultValue?: () => any;
	}

	interface ParseResult {
		prop: Record<string, any>;
		eaten: string;
	}

	function parse(
		value: string,
		indexNext?: number,
		userConfig?: ParseConfig,
	): ParseResult;

	export = parse;
}
