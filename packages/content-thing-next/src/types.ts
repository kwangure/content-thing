export type DropLast<T extends unknown[]> = T extends []
	? []
	: T extends [...infer H, unknown]
		? H
		: never;

export type Last<T extends unknown[]> = T extends [...unknown[], infer L]
	? L
	: never;

export type MaybePromise<T> = T | Promise<T>;

export type ReadonlyDeep<T> = {
	readonly [K in keyof T]: T[K] extends object ? ReadonlyDeep<T[K]> : T[K];
} & Record<never, never>;

export type Simplify<T> = { [K in keyof T]: T[K] } & Record<never, never>;
