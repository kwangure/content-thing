import { customType } from 'drizzle-orm/sqlite-core';

/**
 * @template TData
 * @template {string} TName
 * @param {TName} name
 */
export function json(name) {
	const __customType =
		/** @type {typeof customType<{ data: TData, driverData: string }>} */ (
			customType
		);
	const __json = __customType({
		dataType: () => 'text',
		fromDriver(value) {
			return JSON.parse(value);
		},
		toDriver(value) {
			return JSON.stringify(value);
		},
	});

	return __json(name);
}
