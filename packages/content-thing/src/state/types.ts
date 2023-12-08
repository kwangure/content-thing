import type { Action, AtomicState, BaseState, StatePaths } from 'hine';
import { FSWatcher } from 'chokidar';
import { loadCollectionConfig } from '../config/load.js';
import { configSchema } from './state.js';

export type ThingContext = {
	config: import('zod').z.infer<typeof configSchema>;
	collectionNames: Set<string>;
	db: import('better-sqlite3').Database;
	logger: import('vite').Logger;
};

export type CollectionContext = {
	collectionConfig: ReturnType<typeof loadCollectionConfig>;
	watcher: FSWatcher;
};

export type CollectionConfig = {
	types: { context: CollectionContext };
	on?: {
		fileAdded: { run: string[] };
		fileChanged: { run: string[] };
	};
};

export type AtomicAction<
	TStateConfig extends Record<string, any>,
	TState extends BaseState<any, any>,
	TStatePath extends keyof StatePaths<TState>,
> = Action<
	AtomicState<
		TStateConfig,
		StatePaths<TState>[TStatePath]['__$ancestorContext']
	>
>;
