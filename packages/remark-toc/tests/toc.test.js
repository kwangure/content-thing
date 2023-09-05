import { describe, it } from 'node:test';
import assert from 'node:assert';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { VFile } from 'vfile';
import remarkTableOfContents from '../src/index.js';

const processor = unified()
	.use(remarkParse)
	.use(remarkStringify)
	.use(remarkFrontmatter)
	.use(remarkTableOfContents)
	.freeze();

describe('toc', () => {
	it('creates toc from headings', async () => {
		const input = new VFile({
			path: '/',
			value: `## h2-1\n## h2-2\nparagraph\n### h3-1`,
		});
		const parsed = processor.parse(input);
		await processor.run(parsed, input);

		assert.deepEqual(input.data, {
			tableOfContents: [
				{
					children: [
						{
							children: [
								{
									children: [],
									depth: 3,
									hash: '#h3-1',
									id: 'h3-1',
									value: 'h3-1\n',
								},
							],
							depth: 2,
							hash: '#h2-2',
							id: 'h2-2',
							value: 'h2-2\n',
						},
					],
					depth: 2,
					hash: '#h2-1',
					id: 'h2-1',
					value: 'h2-1\n',
				},
			],
		});
	});
	it('creates toc without headings', async () => {
		const input = new VFile({
			value: `paragraph-1\n\nparagraph-2`,
		});
		const parsed = processor.parse(input);
		await processor.run(parsed, input);

		assert.deepEqual(input.data, {
			tableOfContents: [],
		});
	});
});
