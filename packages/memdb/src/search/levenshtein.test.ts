import { describe, it, expect } from 'vitest';
import { levenshteinDistance } from './levenshtein.js';

describe('levenshtein', () => {
	it('calculates Levenshtein distance correctly', () => {
		expect(levenshteinDistance('a', 'b')).toBe(1);
		expect(levenshteinDistance('ab', 'ac')).toBe(1);
		expect(levenshteinDistance('ac', 'bc')).toBe(1);
		expect(levenshteinDistance('abc', 'axc')).toBe(1);
		expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
		expect(levenshteinDistance('xabxcdxxefxgx', '1ab2cd34ef5g6')).toBe(6);
		expect(levenshteinDistance('cat', 'cow')).toBe(2);
		expect(levenshteinDistance('xabxcdxxefxgx', 'abcdefg')).toBe(6);
		expect(levenshteinDistance('javawasneat', 'scalaisgreat')).toBe(7);
		expect(levenshteinDistance('example', 'samples')).toBe(3);
		expect(levenshteinDistance('sturgeon', 'urgently')).toBe(6);
		expect(levenshteinDistance('levenshtein', 'frankenstein')).toBe(6);
		expect(levenshteinDistance('distance', 'difference')).toBe(5);
		expect(
			levenshteinDistance(
				'因為我是中國人所以我會說中文',
				'因為我是英國人所以我會說英文',
			),
		).toBe(2);
	});
});
