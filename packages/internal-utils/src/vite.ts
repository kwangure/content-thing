export class StructuredID {
	#fragment: string;
	#query: URLSearchParams;
	path: string;
	constructor(path: string) {
		let queryString: string;
		let fragment: string;

		[path, queryString = ''] = path.split('?');
		[path, fragment = ''] = path.split('#');

		this.path = path;
		this.#fragment = fragment;
		this.#query = new URLSearchParams(queryString);
	}
	get fragment() {
		return this.#fragment;
	}
	get query() {
		return this.#query;
	}
	get value() {
		const values = [this.path];
		if (this.#fragment) {
			values.push(`#${this.#fragment}`);
		}
		if (this.#query.size > 0) {
			/**
			 * Replace equal signs in empty query parameters.
			 * Given `x=&y=123&z=` return `x&y=123&z`.
			 */
			values.push(`?${this.#query.toString().replace(/=(?=&|$)/gm, '')}`);
		}
		return values.join('');
	}
}
