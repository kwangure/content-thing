export interface TocEntry {
	value: string;
	id: string;
	hash: string;
	depth: 1 | 2 | 3;
	children: TocEntry[];
}
