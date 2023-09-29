import { describe, it } from 'node:test';
import assert from 'node:assert';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import { remarkVariables } from '../src/index.js';
import { remarkYamlParse } from '@content-thing/remark-yaml-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

const processor = unified()
	.use(remarkParse)
	.use(remarkFrontmatter)
	.use(remarkYamlParse)
	.use(remarkVariables)
	.freeze();

describe('remark-variables', async () => {
	it('replaces variables', async () => {
		const input = '---\nfoo: bar\n---\n{% frontmatter.foo %}';
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);
		visit(transformed, 'text', (node) => {
			assert.strictEqual(node.value, 'bar');
		});
	});
});
