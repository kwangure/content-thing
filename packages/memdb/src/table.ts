/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ColumnType, InferColumnType } from './column.js';

export function createTable<T extends TableSchema>(
	columns: T,
	records: InferSchemaRecord<T>[],
): Table<InferSchemaRecord<T>> {
	return { columns, records };
}

export type Table<T extends Record<string, any>> = {
	columns: {
		[key: string]: ColumnType<any, any>;
	};
	records: T[];
};

export type TableSchema = {
	[key: string]: ColumnType<any, any>;
	/* eslint-disable-next-line @typescript-eslint/ban-types */
} & {};

export type ComputedFields<T> = {
	[K: string]: (record: T) => any;
	/* eslint-disable-next-line @typescript-eslint/ban-types */
} & {};

export type InferSchemaRecord<T extends TableSchema> = {
	[K in keyof T]: InferColumnType<T[K]>;
	/* eslint-disable-next-line @typescript-eslint/ban-types */
} & {};
