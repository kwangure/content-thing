import type { Table, TableRecord } from './table.js';
import type { Simplify } from './types.js';

type WhereCondition<T extends TableRecord> = (record: T) => boolean;

export function filter<T extends TableRecord>(table: Table<T>) {
	/* eslint-disable-next-line @typescript-eslint/ban-types */
	return new FilterBuilder<T, {}, keyof T & string>(table);
}

export type ComputedFields<T> = {
	[K: string]: (record: T) => unknown;
	/* eslint-disable-next-line @typescript-eslint/ban-types */
} & {};

class FilterBuilder<
	TRecord extends TableRecord,
	TComputed extends ComputedFields<TRecord>,
	TSelected extends keyof TRecord,
> {
	table: Table<TRecord>;
	whereCondition: WhereCondition<TRecord> | null = null;
	computedFields: TComputed | null = null;
	limitValue: number;
	selectedFields;

	constructor(table: Table<TRecord>) {
		const record = table.records[0] ?? {};
		this.selectedFields = new Set(Object.keys(record) as TSelected[]);
		this.table = table;
		this.limitValue = table.records.length;
	}

	select<T extends keyof TRecord>(...fields: T[]) {
		this.selectedFields.clear();
		for (const field of fields) {
			this.selectedFields.add(field as unknown as TSelected);
		}
		return this as unknown as FilterBuilder<TRecord, TComputed, T>;
	}

	where(condition: WhereCondition<TRecord>): this {
		this.whereCondition = condition;
		return this;
	}

	with<T extends ComputedFields<TRecord>>(fields: T) {
		this.computedFields = fields as unknown as TComputed;
		return this as unknown as FilterBuilder<TRecord, T, TSelected>;
	}

	limit(n: number): this {
		if (n >= 0) {
			this.limitValue = n;
		}
		return this;
	}
}

export function execute<
	TRecord extends TableRecord,
	TComputed extends ComputedFields<TRecord>,
	TSelected extends keyof TRecord & string,
>(queryBuilder: FilterBuilder<TRecord, TComputed, TSelected>) {
	const { table, whereCondition, computedFields, selectedFields, limitValue } =
		queryBuilder;

	type QueryResult = Simplify<
		Pick<TRecord, TSelected> & {
			[K in keyof TComputed]: ReturnType<TComputed[K]>;
		}
	>;
	const processedResults: QueryResult[] = [];
	if (limitValue === 0) {
		return processedResults;
	}

	for (const record of table.records) {
		if (whereCondition && !whereCondition(record)) {
			continue;
		}

		const filteredRecord: TableRecord = {};
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

		processedResults.push(filteredRecord as QueryResult);

		if (processedResults.length >= limitValue) {
			break;
		}
	}

	return processedResults;
}
