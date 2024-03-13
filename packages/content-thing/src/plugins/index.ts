import type {
	CollectionPlugin,
	BuildContext,
	OnLoadOptions,
	OnLoadArgs,
	OnLoadResult,
} from './types'; // Adjust the import path as necessary

export class PluginContainer implements BuildContext {
	private onLoadHandlers: {
		options: OnLoadOptions;
		callback: (args: OnLoadArgs) => Promise<OnLoadResult>;
	}[] = [];

	constructor(plugins: CollectionPlugin[]) {
		plugins.forEach((plugin) => plugin.setup(this));
	}

	onLoad(
		options: OnLoadOptions,
		callback: (args: OnLoadArgs) => Promise<OnLoadResult>,
	): void {
		this.onLoadHandlers.push({ options, callback });
	}

	async loadFile(
		path: string,
		collectionType: string,
	): Promise<OnLoadResult | null> {
		for (const handler of this.onLoadHandlers) {
			const { filter } = handler.options;
			const collectionTypeMatch =
				filter.collection?.type?.test(collectionType) ?? true;
			const pathMatch = filter.path?.test(path) ?? true;

			if (collectionTypeMatch && pathMatch) {
				return await handler.callback({
					path,
					collection: { type: collectionType },
				});
			}
		}
		return null;
	}
}
