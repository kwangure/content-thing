import { remarkAttributes } from '@content-thing/remark-attributes';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import YAML from 'yaml';

const processor = unified().use(remarkParse).use(remarkAttributes);

export function parseMarkdownSections(markdown: string) {
	const regex = /^---\s*[\r\n]+([\s\S]*?)\s*[\r\n]+---\s*([\s\S]*)$/;
	const match = markdown.match(regex);

	const frontmatter = match ? YAML.parse(match[1].trim()) : {};
	const content = match ? match[2].trim() : markdown.trim();

	const tree = processor.parse(content);
	const transformedTree = processor.runSync(tree);

	return {
		frontmatter,
		content: transformedTree,
	};
}
