export type Simplify<T> = {
	[K in keyof T]: T[K];
	/* eslint-disable-next-line @typescript-eslint/ban-types */
} & {};
