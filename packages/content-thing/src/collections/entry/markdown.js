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

export class MarkdownEntry extends BaseEntry {
	type = 'markdown';
	processValue() {
		const tree = processor.parse(/** @type {any} */ (this));
		return processor.runSync(tree, /** @type {any} */ (this));
	}
	writeOutput() {
		const ast = this.processValue();
		/** @type {Record<string, any>} */
		const data = {
			id: this.id,
			content: ast,
			headingTree: this.data.tableOfContents,
		};

		const frontmatter = ast.data?.frontmatter;
		if (frontmatter) {
			for (const [key, value] of Object.entries(frontmatter)) {
				data[`data_${key}`] = value;
			}
		}

		write(this.output, JSON.stringify(data, null, 4));
	}
}
