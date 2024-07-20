export type LineInterval = [number, number];

export function parseRanges(input: string, max: number) {
	const parts = input.split(',');
	const result: LineInterval[] = [];

	for (const part of parts) {
		// Handling ranges
		const range = part.match(/(-?\d+)(\s*-\s*(-?\d+)?)?/);
		if (range) {
			const start = Number(range[1]);
			let end;
			if (range[2] === undefined) {
				end = start;
			} else {
				end = range[3] === undefined ? max : Number(range[3]);
			}
			result.push([start, end]);
		}
	}

	return result;
}

export function selectLines<T>(lines: T[], ranges: [number, number][]) {
	const totalLines = lines.length;
	const result: T[] = [];

	for (const [start, end] of ranges) {
		// Convert one-indexed to zero-indexed
		let startIndex = start > 0 ? start - 1 : totalLines + start;
		let endIndex = end > 0 ? end - 1 : totalLines + end;

		if (startIndex < 0) startIndex = 0;
		if (endIndex >= totalLines) endIndex = totalLines - 1;

		if (startIndex <= endIndex) {
			for (let i = startIndex; i <= endIndex; i++) {
				result.push(lines[i]!);
			}
		} else {
			for (let i = startIndex; i >= endIndex; i--) {
				result.push(lines[i]!);
			}
		}
	}

	return result;
}
