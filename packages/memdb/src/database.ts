/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ComputedFields, Table } from './table.js';
import type { Simplify } from './types.js';

type WhereCondition<T extends Record<string, any>> = (record: T) => boolean;

export function query<T extends Record<string, any>>(table: Table<T>) {
	/* eslint-disable-next-line @typescript-eslint/ban-types */
	return new QueryBuilder<T, {}, keyof T>(table);
}

class QueryBuilder<
	TRecord extends Record<string, any>,
	TComputed extends ComputedFields<TRecord>,
	TSelected extends keyof TRecord,
> {
	table: Table<TRecord>;
	whereCondition: WhereCondition<TRecord> | null = null;
	computedFields: TComputed | null = null;
	selectedFields;
	limitValue: number;

	constructor(table: Table<TRecord>) {
		this.selectedFields = new Set(Object.keys(table.columns) as TSelected[]);
		this.table = table;
		this.limitValue = table.records.length;
	}

	select<T extends keyof TRecord>(...fields: T[]) {
		this.selectedFields.clear();
		for (const field of fields) {
			this.selectedFields.add(field as unknown as TSelected);
		}
		return this as unknown as QueryBuilder<TRecord, TComputed, T>;
	}

	where(condition: WhereCondition<TRecord>): this {
		this.whereCondition = condition;
		return this;
	}

	with<T extends ComputedFields<TRecord>>(fields: T) {
		this.computedFields = fields as unknown as TComputed;
		return this as unknown as QueryBuilder<TRecord, T, TSelected>;
	}

	limit(n: number): this {
		if (n >= 0) {
			this.limitValue = n;
		}
		return this;
	}
}

export function execute<
	TRecord extends Record<string, any>,
	TComputed extends ComputedFields<TRecord>,
	TSelected extends keyof TRecord,
>(
	queryBuilder: QueryBuilder<TRecord, TComputed, TSelected>,
): Array<
	Simplify<
		Pick<TRecord, TSelected> & {
			[K in keyof TComputed]: ReturnType<TComputed[K]>;
		}
	>
> {
	const { table, whereCondition, computedFields, selectedFields, limitValue } =
		queryBuilder;

	const processedResults: any[] = [];
	if (limitValue === 0) {
		return processedResults;
	}

	for (const record of table.records) {
		if (whereCondition && !whereCondition(record)) {
			continue;
		}

		const filteredRecord: any = {};
		for (const field of selectedFields) {
			if (field in record) {
				filteredRecord[field] = record[field];
			}
		}

		if (computedFields) {
			for (const [field, computedFunc] of Object.entries(computedFields)) {
				filteredRecord[field] = computedFunc(record);
			}
		}

		processedResults.push(filteredRecord);

		if (processedResults.length >= limitValue) {
			break;
		}
	}

	return processedResults;
}
