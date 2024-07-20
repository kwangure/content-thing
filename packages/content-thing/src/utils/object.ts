/**
 * Checks for "plain old Javascript object", typically made as an object
 * literal. Excludes Arrays and built-in types like Buffer.
 */
function isPlainObject(x: unknown): x is object {
	return typeof x === 'object' && x?.constructor === Object;
}

/**
 * Merge b into a, recursively, mutating a.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeInto(a: Record<string, any>, b: Record<string, any>) {
	for (const prop in b) {
		if (isPlainObject(b[prop])) {
			if (!isPlainObject(a[prop])) {
				a[prop] = {};
			}
			mergeInto(a[prop], b[prop]);
		} else if (Array.isArray(b[prop])) {
			if (!Array.isArray(a[prop])) {
				a[prop] = [];
			}
			a[prop].push(...b[prop]);
		} else {
			a[prop] = b[prop];
		}
	}

	return a;
}
