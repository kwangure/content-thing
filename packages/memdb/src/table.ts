/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type NotAUnion<T, U = T> = U extends any
	? [T] extends [U]
		? T
		: never
	: never;

export function createTable<T extends Record<string, unknown>>(
	records: NotAUnion<T>[],
) {
	return { records } satisfies Table<T>;
}

export type Table<T extends Record<string, unknown>> = {
	records: NotAUnion<T>[];
};
