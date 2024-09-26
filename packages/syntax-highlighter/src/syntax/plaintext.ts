import type { Highlighter } from '../highlight.js';

/**
 * A syntax highlighter that does no highlighting
 */
export const plaintext: Highlighter = (code, options) => {
	const from = options?.from ?? 0;
	const to = options?.to ?? code.length;

	return [{ segment: code.slice(from, to), color: '' }];
};
