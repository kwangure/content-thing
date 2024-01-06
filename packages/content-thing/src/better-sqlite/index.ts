import Database from 'better-sqlite3';
import type { DrizzleConfig } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

export function createCollection<
	TSchema extends Record<string, unknown> = Record<string, never>,
>(dbPath: string, config: DrizzleConfig<TSchema>) {
	// Vite prepends file:// in production. Remove it.
	const normalizedDBPath = dbPath.replace(/^[a-zA-Z]+:\/\//, '');
	const sqlite = new Database(normalizedDBPath);
	const database = drizzle(sqlite, config);
	return database;
}
