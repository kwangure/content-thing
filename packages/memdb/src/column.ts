/* eslint-disable @typescript-eslint/no-explicit-any */
import type { StringLiteral } from './types.js';

export type ColumnType<TName, TType> = {
	name: StringLiteral<TName>;
	type: TType;
};

export type InferColumnType<T extends ColumnType<any, any>> =
	T extends ColumnType<any, infer U> ? U : never;

export function string<T extends string>(name: StringLiteral<T>) {
	return Symbol(name) as unknown as ColumnType<typeof name, string>;
}

export function number<T extends string>(name: StringLiteral<T>) {
	return Symbol(name) as unknown as ColumnType<typeof name, number>;
}

export function custom<T extends string, U>(name: StringLiteral<T>) {
	return Symbol(name) as unknown as ColumnType<typeof name, U>;
}
