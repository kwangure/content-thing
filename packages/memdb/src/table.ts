/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type NotAUnion<T, U = T> = U extends any
	? [T] extends [U]
		? T
		: never
	: never;

export interface TableRecord {
	[x: string]: unknown;
}

export function createTable<T extends TableRecord>(records: NotAUnion<T>[]) {
	return { records } satisfies Table<T>;
}

export type Table<T extends TableRecord> = {
	records: NotAUnion<T>[];
};
