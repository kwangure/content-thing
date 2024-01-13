import { describe, it } from 'node:test';
import assert from 'node:assert';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import remarkYamlParse from '../src/index.js';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

const processor = unified()
	.use(remarkParse)
	.use(remarkFrontmatter)
	.use(remarkYamlParse);

describe('yaml', () => {
	it('parses code attributes', async () => {
		const input = '---\nfoo: bar\n---';
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);
		visit(transformed, 'root', (node) => {
			assert.deepStrictEqual(node.data, {
				frontmatter: {
					foo: 'bar',
				},
			});
			assert.strictEqual(node.children.length, 0);
		});
	});
});
