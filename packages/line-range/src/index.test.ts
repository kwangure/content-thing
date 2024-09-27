import { describe, test, expect } from 'vitest';
import { parseRanges } from './index.js';

const FICTIONAL_DOC_LENGTH = 69420;

const testCases: [string, [number, number | null][]][] = [
	['1', [[1, 1]]],
	['-1', [[-1, -1]]],
	['1-5', [[1, 5]]],
	['-5--1', [[-5, -1]]],
	['3--1', [[3, -1]]],
	['-5-2', [[-5, 2]]],
	[
		'1,3-5,-2',
		[
			[1, 1],
			[3, 5],
			[-2, -2],
		],
	],
	[
		'1-3,5-7',
		[
			[1, 3],
			[5, 7],
		],
	],
	[
		'-6--4,-3--1',
		[
			[-6, -4],
			[-3, -1],
		],
	],
	[
		'1,-3--1,5-7',
		[
			[1, 1],
			[-3, -1],
			[5, 7],
		],
	],
	['3-', [[3, FICTIONAL_DOC_LENGTH]]],
	['-5-', [[-5, FICTIONAL_DOC_LENGTH]]],
	['5-3', [[5, 3]]],
	['-1--3', [[-1, -3]]],
	['3--5', [[3, -5]]],
	[
		'1,3-,5-3',
		[
			[1, 1],
			[3, FICTIONAL_DOC_LENGTH],
			[5, 3],
		],
	],
	[
		'1,3-5,-2,-4--2,7-',
		[
			[1, 1],
			[3, 5],
			[-2, -2],
			[-4, -2],
			[7, FICTIONAL_DOC_LENGTH],
		],
	],
];

// Use describe and test.each to run the test cases
describe('parseRanges', () => {
	test.each(testCases)('parseRanges("%s")', (input, expected) => {
		expect(parseRanges(input, FICTIONAL_DOC_LENGTH)).toEqual(expected);
	});
});
