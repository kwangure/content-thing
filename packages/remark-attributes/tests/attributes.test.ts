import { describe, it } from 'node:test';
import assert from 'node:assert';
import remarkAttributes from '../src/index.js';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Text } from 'mdast';

const processor = unified().use(remarkParse).use(remarkAttributes);

describe('code', () => {
	it('parses code attributes', async () => {
		const input = '```js {foo=bar}\n```';
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);
		visit(transformed, 'code', (node) => {
			assert.deepStrictEqual(node.data, {
				attributes: {
					foo: 'bar',
				},
			});
			assert.strictEqual(node.meta, '');
		});
	});
	it('allows preceeding whitespace', async () => {
		const input = '```js     {foo=bar}\n```';
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);
		visit(transformed, 'code', (node) => {
			assert.deepStrictEqual(node.data, {
				attributes: {
					foo: 'bar',
				},
			});
			assert.strictEqual(node.meta, '');
		});
	});
	it('ignores other meta content', async () => {
		const input = '```js  {foo=bar} meta content\n```';
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);
		visit(transformed, 'code', (node) => {
			assert.deepStrictEqual(node.data, {
				attributes: {
					foo: 'bar',
				},
			});
			assert.strictEqual(node.meta, ' meta content');
		});
	});
	it('ignores non-preceeding attributes', async () => {
		const input = '```js other {foo=bar} meta content\n```';
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);
		visit(transformed, 'code', (node) => {
			assert.strictEqual(node.meta, 'other {foo=bar} meta content');
		});
	});
});

describe('inlineCode', () => {
	it('parses inline code attributes', async () => {
		const input = '`foo`{bar=baz}';
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);
		visit(transformed, 'inlineCode', (node) => {
			assert.deepStrictEqual(node.data, {
				attributes: {
					bar: 'baz',
				},
			});
		});
	});
	it('cleans up next sibling', async () => {
		const input = '`foo`{bar=baz} abc';
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);
		visit(transformed, 'inlineCode', (node, index, parent) => {
			if (typeof index !== 'number') return; // Hush TypeScript. Hush.

			const nextSibling = parent?.children[index + 1];
			assert.deepStrictEqual(node.data, {
				attributes: {
					bar: 'baz',
				},
			});

			assert.strictEqual((nextSibling as Text)?.value, ' abc');
		});
	});
	it('allows preceeding whitespace', async () => {
		const input = '`foo`     {bar=baz} abc';
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);
		visit(transformed, 'inlineCode', (node, index, parent) => {
			if (typeof index !== 'number') return; // Hush TypeScript. Hush.

			const nextSibling = parent?.children[index + 1];
			assert.deepStrictEqual(node.data, {
				attributes: {
					bar: 'baz',
				},
			});

			assert.strictEqual((nextSibling as Text)?.value, ' abc');
		});
	});
});
