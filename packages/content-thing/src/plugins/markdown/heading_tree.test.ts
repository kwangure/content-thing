import { describe, expect, it } from 'vitest';
import remarkStringify from 'remark-stringify';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { getHeadingTree } from './heading_tree';
import type { Root } from 'mdast';

const processor = unified().use(remarkParse).use(remarkStringify);

describe('toc', () => {
	it('creates toc from headings', async () => {
		const parsed = processor.parse(`## h2-1\n## h2-2\nparagraph\n### h3-1`);
		const transformedTree = processor.runSync(parsed);
		const tableOfContents = getHeadingTree(transformedTree as Root);
		expect(tableOfContents).toStrictEqual([
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
		]);
	});
	it('creates toc without headings', async () => {
		const parsed = processor.parse('paragraph-1\n\nparagraph-2');
		const transformedTree = processor.runSync(parsed);
		const tableOfContents = getHeadingTree(transformedTree as Root);

		expect(tableOfContents).toStrictEqual([]);
	});
});
