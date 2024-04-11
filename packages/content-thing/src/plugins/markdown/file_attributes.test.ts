import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	extractLines,
	parseFileMeta,
	processFileAttributes,
} from './file_attributes';
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

	it('replaces code block content based on file attribute', () => {
		const markdown = `\`\`\`js {file=example.js}\n\n\`\`\``;
		const parsed = processor.parse(markdown);
		const transformed = processor.runSync(parsed);
		processFileAttributes(transformed, testFile);
		expect(toMarkdown(parsed)).toContain('console.log("Hello, world!");');
	});

	it('handles relative path resolution', () => {
		const markdown = `\`\`\`js {file=./example.js}\n\`\`\``;
		const parsed = processor.parse(markdown);
		const transformed = processor.runSync(parsed);
		processFileAttributes(transformed, testFile);
		expect(toMarkdown(parsed)).toContain('console.log("Hello, world!");');
	});

	it('leaves code block unchanged when file attribute is missing', () => {
		const markdown = '```js\nconsole.log("Unchanged");\n```';
		const parsed = processor.parse(markdown);
		const transformed = processor.runSync(parsed);
		processFileAttributes(transformed, testFile);
		expect(toMarkdown(parsed)).toContain('console.log("Unchanged");');
	});

	it('extracts specific lines based on start and end attributes in code blocks', () => {
		const markdown = `\`\`\`js {file=multiline.js#L2::3}\n\`\`\``;
		const parsed = processor.parse(markdown);
		const transformed = processor.runSync(parsed);
		processFileAttributes(transformed, testFile);
		expect(toMarkdown(parsed)).toContain('Line 2\nLine 3');
	});

	it('handles the absence of the file attribute gracefully', () => {
		const markdown = '```js\nconsole.log("No file attribute");\n```';
		const parsed = processor.parse(markdown);
		const transformed = processor.runSync(parsed);
		processFileAttributes(transformed, testFile);
		expect(toMarkdown(parsed)).toContain('console.log("No file attribute");');
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

describe('parseFileMeta', () => {
	it('should parse filepath without line numbers', () => {
		const meta = 'path/to/file.js';
		expect(parseFileMeta(meta)).toEqual({ filepath: 'path/to/file.js' });
	});

	it('should parse filepath with a start line', () => {
		const meta = 'path/to/file.js#L2';
		expect(parseFileMeta(meta)).toEqual({
			filepath: 'path/to/file.js',
			start: 2,
		});
	});

	it('should parse filepath with start and end lines', () => {
		const meta = 'path/to/file.js#L2::5';
		expect(parseFileMeta(meta)).toEqual({
			filepath: 'path/to/file.js',
			start: 2,
			end: 5,
		});
	});

	it('should parse filepath with no start line but with endline', () => {
		const meta = 'path/to/file.js#L::5';
		expect(parseFileMeta(meta)).toEqual({
			filepath: 'path/to/file.js',
			end: 5,
		});
	});

	it('should parse filepath with negative start line', () => {
		const meta = 'path/to/file.js#L-2';
		expect(parseFileMeta(meta)).toEqual({
			filepath: 'path/to/file.js',
			start: -2,
		});
	});

	it('should parse filepath with negative start and end lines', () => {
		const meta = 'path/to/file.js#L-2::-1';
		expect(parseFileMeta(meta)).toEqual({
			filepath: 'path/to/file.js',
			start: -2,
			end: -1,
		});
	});
});

describe('extractLines', () => {
	const content = `Line1\nLine2\nLine3`;

	it('should return content from start line to end when only start is provided', () => {
		expect(extractLines(content, 2)).toBe(`Line2\nLine3`);
	});

	it('should return content between start and end lines', () => {
		expect(extractLines(content, 1, 2)).toBe(`Line1\nLine2`);
	});

	it('should handle end line beyond content length', () => {
		expect(extractLines(content, 1, 5)).toBe(`Line1\nLine2\nLine3`);
	});

	it('should return empty string when start line is beyond content length', () => {
		expect(extractLines(content, 4)).toBe('');
	});

	it('should process content ending with a newline character correctly', () => {
		const contentWithNewlineEnd = `Line1\nLine2\n`;
		expect(extractLines(contentWithNewlineEnd, 1, 2)).toBe(`Line1\nLine2`);
	});

	it('should handle negative start line as valid input', () => {
		expect(extractLines(content, -2)).toBe(`Line2\nLine3`);
	});

	it('should handle negative end line as valid input', () => {
		expect(extractLines(content, 1, -1)).toBe(`Line1\nLine2`);
	});

	it('should process content with negative start and end lines correctly', () => {
		expect(extractLines(content, -3, -1)).toBe(`Line1\nLine2`);
	});
});
