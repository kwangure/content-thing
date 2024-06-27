declare module 'md-attr-parser' {
	interface ParseConfig {
		defaultValue?: unknown;
	}

	interface ParseResult {
		prop: Record<string, unknown>;
		eaten: string;
	}

	function parse(
		value: string,
		indexNext?: number,
		userConfig?: ParseConfig,
	): ParseResult;

	export = parse;
}
