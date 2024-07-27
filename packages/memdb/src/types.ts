export type Simplify<T> = {
	[K in keyof T]: T[K];
	/* eslint-disable-next-line @typescript-eslint/ban-types */
} & {};
export type StringLiteral<T> = T extends string
	? string extends T
		? never
		: T
	: never;
