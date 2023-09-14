import { DrizzleEntry } from './drizzle.js';
import { remarkAttributes } from '@content-thing/remark-attributes';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import { remarkRichAttributes } from '@content-thing/remark-rich-attributes';
import { remarkVariables } from '@content-thing/remark-variables';
import remarkStringify from 'remark-stringify';
import { remarkTableOfContents } from '@content-thing/remark-toc';
import { remarkYamlParse } from '@content-thing/remark-yaml-parse';
import { unified } from 'unified';
import { write } from '@content-thing/internal-utils/filesystem';

const processor = unified()
	.use(remarkParse)
	.use(remarkStringify)
	.use(remarkFrontmatter)
	.use(remarkYamlParse)
	.use(remarkAttributes)
	.use(remarkRichAttributes)
	.use(remarkVariables)
	.use(remarkTableOfContents);

export class MarkdownEntry extends DrizzleEntry {
	type = 'markdown';
	/**
	 * A property used by Rehype plugins to output arbitrary data
	 *
	 * @type {Record<string, any>}
	 */
	data = {};
	getRecord() {
		const tree = processor.parse(/** @type {any} */ (this));
		const transformedTree = processor.runSync(tree, /** @type {any} */ (this));

		/** @type {import('./types.js').EntryRecord} */
		const data = {
			...super.getRecord(),
			content: transformedTree,
			headingTree: this.data.tableOfContents,
		};

		const frontmatter = transformedTree.data?.frontmatter;
		if (frontmatter) {
			for (const [key, value] of Object.entries(frontmatter)) {
				data[`data_${key}`] = value;
			}
		}

		return data;
	}
	writeOutput() {
		write(this.output, JSON.stringify(this.getRecord(), null, 4));
	}
}
