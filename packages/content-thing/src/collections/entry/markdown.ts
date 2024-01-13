import { BaseEntry } from './base.js';
import { remarkAttributes } from '@content-thing/remark-attributes';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import { remarkRichAttributes } from '@content-thing/remark-rich-attributes';
import { remarkVariables } from '@content-thing/remark-variables';
import remarkStringify from 'remark-stringify';
import { remarkTableOfContents } from '@content-thing/remark-toc';
import { remarkYamlParse } from '@content-thing/remark-yaml-parse';
import { unified } from 'unified';
import type { EntryRecord } from './types.js';

const processor = unified()
	.use(remarkParse)
	.use(remarkStringify)
	.use(remarkFrontmatter)
	.use(remarkYamlParse)
	.use(remarkAttributes)
	.use(remarkRichAttributes)
	.use(remarkVariables)
	.use(remarkTableOfContents);

export class MarkdownEntry extends BaseEntry {
	/**
	 * Make `unified` to treat `BaseEntry` like a `VFile`
	 */
	messages = [];
	// Make `unified` to treat `BaseEntry` like a `VFile`
	message() {}
	type = 'markdown';
	/**
	 * A property used by Rehype plugins to output arbitrary data
	 */
	data: Record<string, any> = {};
	getRecord() {
		const tree = processor.parse(this as any);
		const transformedTree = processor.runSync(tree, this as any);

		return {
			...transformedTree.data?.frontmatter,
			_content: transformedTree,
			_id: this.id,
			_headingTree: this.data.tableOfContents,
		} as EntryRecord;
	}
}
