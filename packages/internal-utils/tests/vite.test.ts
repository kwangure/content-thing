import { assert, describe, it } from 'vitest';
import { StructuredID } from '../src/vite.js';

describe('StructuredID', () => {
	it('should create an instance with the given path', () => {
		const id = new StructuredID('foo/bar');
		assert.strictEqual(id.path, 'foo/bar');
		assert.strictEqual(id.fragment, '');
		assert.strictEqual(id.query.toString(), '');
	});

	it('should create an instance with the given path and fragment', () => {
		const id = new StructuredID('foo/bar#baz');
		assert.strictEqual(id.path, 'foo/bar');
		assert.strictEqual(id.fragment, 'baz');
		assert.strictEqual(id.query.toString(), '');
	});

	it('should create an instance with the given path and query', () => {
		const id = new StructuredID('foo/bar?x&y=1&z=');
		assert.strictEqual(id.path, 'foo/bar');
		assert.strictEqual(id.fragment, '');
		assert.strictEqual(id.query.toString(), 'x=&y=1&z=');
	});

	it('should create an instance with the given path, fragment and query', () => {
		const id = new StructuredID('foo/bar#baz?x&y=1&z=');
		assert.strictEqual(id.path, 'foo/bar');
		assert.strictEqual(id.fragment, 'baz');
		assert.strictEqual(id.query.toString(), 'x=&y=1&z=');
	});

	// test value getter with different inputs
	it('should return the value with the path only', () => {
		const id = new StructuredID('foo/bar');
		assert.strictEqual(id.value, 'foo/bar');
	});

	it('should return the value with the path and fragment', () => {
		const id = new StructuredID('foo/bar#baz');
		assert.strictEqual(id.value, 'foo/bar#baz');
	});

	it('should return the value with the path and query', () => {
		const id = new StructuredID('foo/bar?x&y=1&z=');
		assert.strictEqual(id.value, 'foo/bar?x&y=1&z');
	});

	it('should return the value with the path, fragment and query', () => {
		const id = new StructuredID('foo/bar#baz?x&y=1&z=');
		assert.strictEqual(id.value, 'foo/bar#baz?x&y=1&z');
	});
});
