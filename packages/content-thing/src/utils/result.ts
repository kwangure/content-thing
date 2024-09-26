export function Ok<T>(value: T): { ok: true; value: T };
export function Ok(value?: undefined): { ok: true };
export function Ok<T>(value?: T) {
	return { ok: true as const, value };
}

export function Err<T extends string, U>(
	type: T,
	meta: U,
): { ok: false; type: T; meta: U };
export function Err<T extends string>(type: T): { ok: false; type: T };
export function Err<T extends string, U>(type: T, meta?: U) {
	return meta ? { ok: false, type, meta } : { ok: false, type };
}

export type Result<T, U> =
	| { ok: false; type: string; meta: U }
	| { ok: true; value: T };
