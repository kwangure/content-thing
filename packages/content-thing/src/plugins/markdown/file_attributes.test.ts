import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { processFileAttributes } from './file_attributes';
import { toMarkdown } from 'mdast-util-to-markdown';
import fs from 'fs';
import path from 'path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkAttributes from '@content-thing/remark-attributes';

const testDir = path.join(__dirname, 'testProcessFileAttributes');
const testFile = path.join(testDir, 'test.md');
const files = {
	'example.js': 'console.log("Hello, world!");',
	'multiline.js': 'Line 1\nLine 2\nLine 3\nLine 4',
	'empty.js': '',
};

const createTestFiles = () => {
	fs.mkdirSync(testDir, { recursive: true });
	Object.entries(files).forEach(([filename, content]) => {
		fs.writeFileSync(path.join(testDir, filename), content, 'utf8');
	});
};

const cleanupTestFiles = () => {
	fs.rmSync(testDir, { recursive: true, force: true });
};

describe('processFileAttributes', () => {
	const processor = unified().use(remarkParse).use(remarkAttributes);

	beforeAll(createTestFiles);
	afterAll(cleanupTestFiles);

	it('leaves code block unchanged when file attribute is missing', () => {
		const markdown = '```js\nconsole.log("Unchanged");\n```';
		const parsed = processor.parse(markdown);
		const transformed = processor.runSync(parsed);
		processFileAttributes(transformed, testFile);
		expect(toMarkdown(parsed)).toContain('console.log("Unchanged");');
	});

	it('processes an empty file correctly', () => {
		const markdown = `\`\`\`js {file=empty.js}\n\`\`\``;
		const parsed = processor.parse(markdown);
		const transformed = processor.runSync(parsed);
		processFileAttributes(transformed, testFile);
		expect(toMarkdown(parsed)).not.toContain('console.log');
	});

	it('replaces inline code content based on file attribute', () => {
		const markdown = `\` \`{file=example.js}`;
		const parsed = processor.parse(markdown);
		const transformed = processor.runSync(parsed);
		processFileAttributes(transformed, testFile);
		expect(toMarkdown(parsed)).toContain('console.log("Hello, world!");');
	});
});
