export interface CollectionPlugin {
	name: string;
	setup: (build: BuildContext) => any;
}

export interface BuildContext {
	onLoad(
		options: OnLoadOptions,
		callback: (args: OnLoadArgs) => Promise<OnLoadResult>,
	): void;
}

export interface OnLoadOptions {
	filter: {
		path?: RegExp;
		collection?: {
			type?: RegExp;
		};
	};
}

export interface OnLoadArgs {
	path: string;
	collection: {
		type: string;
	};
}

export interface OnLoadResult {
	record: Record<string, string | number> & { _id: string };
}
