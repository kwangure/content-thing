import { after, describe, it } from 'node:test';
import { rimraf, write } from '@content-thing/internal-utils/filesystem';
import assert from 'node:assert';
import path from 'node:path';
import { remarkAttributes } from '@content-thing/remark-attributes';
import { remarkRichAttributes } from '../src/index.js';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

const processor = unified()
	.use(remarkParse)
	.use(remarkAttributes)
	.use(remarkRichAttributes);

let tempDir = path.join(__dirname, 'temp');

function createTempJsFile(content: string, filename: string) {
	const tempFilePath = path.join(tempDir, filename);
	write(tempFilePath, content);
	return tempFilePath;
}

describe('remarkRichAttributes', () => {
	after(() => {
		rimraf(tempDir);
	});

	it('replaces code block content based on file attribute', async () => {
		const tempFilePath = createTempJsFile(
			'console.log("Hello, world!");',
			'hello.js',
		);
		const input = `\`\`\`js {file=${tempFilePath}}\n\`\`\``;
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);

		visit(transformed, 'code', (node) => {
			assert.strictEqual(node.value, 'console.log("Hello, world!");');
		});
	});

	it('leaves code block unchanged when file attribute is missing', async () => {
		const input = '```js\n```';
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);

		visit(transformed, 'code', (node) => {
			assert.strictEqual(node.value, '');
		});
	});

	// TODO: Add error to VFile
	it('leaves code block unchanged when file does not exist', async () => {
		const input = `\`\`\`js {file=/non/existing/path.js}\n\`\`\``;
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);

		visit(transformed, 'code', (node) => {
			assert.strictEqual(node.value, '');
		});
	});

	it('extracts specific lines based on start attributes in code blocks', async () => {
		const tempFilePath = createTempJsFile(
			'Line 1\nLine 2\nLine 3\nLine 4',
			'lines.js',
		);
		const input = `\`\`\`js {file=${tempFilePath}#L2}\n\`\`\``;
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);

		visit(transformed, 'code', (node) => {
			assert.strictEqual(node.value, 'Line 2');
		});
	});

	it('extracts specific lines based on start and end attributes in code blocks', async () => {
		const tempFilePath = createTempJsFile(
			'Line 1\nLine 2\nLine 3\nLine 4',
			'lines.js',
		);
		const input = `\`\`\`js {file=${tempFilePath}#L2-3}\n\`\`\``;
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);

		visit(transformed, 'code', (node) => {
			assert.strictEqual(node.value, 'Line 2\nLine 3');
		});
	});

	it('replaces inline code block content based on file attribute', async () => {
		const tempFilePath = createTempJsFile(
			'console.log("Hello, world!");',
			'hello.js',
		);
		const input = `\` \`{file=${tempFilePath}}`;
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);

		visit(transformed, 'inlineCode', (node) => {
			assert.strictEqual(node.value, 'console.log("Hello, world!");');
		});
	});

	it('extracts specific lines based on start attributes in code blocks', async () => {
		const tempFilePath = createTempJsFile(
			'Line 1\nLine 2\nLine 3\nLine 4',
			'lines.js',
		);
		const input = `\` \`{file=${tempFilePath}#L2}\n\`\`\``;
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);

		visit(transformed, 'inlineCode', (node) => {
			assert.strictEqual(node.value, 'Line 2');
		});
	});

	it('extracts specific lines based on start and end attributes in inline code blocks', async () => {
		const tempFilePath = createTempJsFile(
			'Line 1\nLine 2\nLine 3\nLine 4',
			'lines.js',
		);
		const input = `\` \`{file=${tempFilePath}#L2-3}`;
		const parsed = processor.parse(input);
		const transformed = await processor.run(parsed);

		visit(transformed, 'inlineCode', (node) => {
			assert.strictEqual(node.value, 'Line 2\nLine 3');
		});
	});
});
