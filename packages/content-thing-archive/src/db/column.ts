import { customType } from 'drizzle-orm/sqlite-core';

export function json<TData, TName extends string>(name: TName) {
	const __json = customType<{ data: TData; driverData: string }>({
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
