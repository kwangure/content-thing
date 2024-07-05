import { highlightCodeBlocks } from './highlight_code.js';
import { processFileAttributes } from './file_attributes.js';
import { processCopyAttributes } from './copy_attributes.js';
import { remarkAttributes } from '@content-thing/remark-attributes';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import YAML from 'yaml';

const processor = unified().use(remarkParse).use(remarkAttributes);

export async function parseMarkdownSections(
	markdown: string,
	filepath: string,
) {
	const regex = /^---\s*[\r\n]+(.*?)[\r\n]+---\s*([\s\S]*)$/;
	const match = markdown.match(regex);

	const frontmatter = match ? YAML.parse(match[1].trim()) : {};
	const content = match ? match[2].trim() : markdown.trim();

	const tree = processor.parse(content);
	const transformedTree = processor.runSync(tree);
	processFileAttributes(transformedTree, filepath);
	processCopyAttributes(transformedTree);
	await highlightCodeBlocks(transformedTree);

	return {
		frontmatter,
		content: transformedTree,
	};
}
