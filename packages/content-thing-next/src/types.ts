export type MaybePromise<T> = T | Promise<T>;

export type ReadonlyDeep<T> = {
	readonly [K in keyof T]: T[K] extends object ? ReadonlyDeep<T[K]> : T[K];
} & Record<never, never>;
