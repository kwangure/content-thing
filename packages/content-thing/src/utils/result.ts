export function Ok<T>(value: T): { ok: true; value: T };
export function Ok(value?: undefined): { ok: true };
export function Ok<T>(value?: T) {
	return { ok: true as const, value };
}

export function Err<T extends string, E extends Error>(
	type: T,
	error: E,
): { ok: false; type: T; error: E };
export function Err<T extends string>(type: T): { ok: false; type: T };
export function Err<T extends string, E extends Error>(type: T, error?: E) {
	return error ? { ok: false, type, error } : { ok: false, type };
}

export type Result<T> = { ok: false; error: Error } | { ok: true; value: T };
