import type { Code, Parent, RootContent } from 'mdast';
import { Imports } from './imports.js';
import {
	cpp,
	css,
	highlightLines,
	html,
	isSupportedLanguage,
	json,
	python,
	rust,
	typescript,
} from '@content-thing/syntax-highlighter';
import { svelte } from '@content-thing/syntax-highlighter/syntax/svelte';
import { plaintext } from '@content-thing/syntax-highlighter/syntax/plaintext';
import {
	parseRanges,
	selectLines,
	type LineInterval,
} from '@content-thing/line-range';

const ELEMENT_PATH = '@svelte-thing/components/elements';

interface Props {
	[x: string]: { type: 'value' | 'scope-variable'; value: unknown };
}

export function component(
	name: string,
	props: Props,
	content: string | null,
	indentLevel: number,
): string {
	const indent = '\t'.repeat(indentLevel);
	const propEntries = Object.entries(props).filter(([, prop]) => {
		if (prop.value === null || prop.value === undefined) return false;
		if (Array.isArray(prop.value) && prop.value.length === 0) return false;
		if (typeof prop.value === 'object' && Object.keys(prop.value).length === 0)
			return false;
		return true;
	});

	let result = `${indent}<${name}`;

	if (propEntries.length > 0) {
		const formattedAttrs = propEntries.map(([key, prop]) => {
			if (prop.type === 'value') {
				return `${key}={${JSON.stringify(prop.value)}}`;
			}
			return `${key}={${prop.value}}`;
		});

		if (formattedAttrs.length === 1 && !content) {
			result += ` ${formattedAttrs[0]}`;
		} else {
			result +=
				'\n' + formattedAttrs.map((attr) => `${indent}\t${attr}`).join('\n');
			result += `\n${indent}`;
		}
	}

	return result + (content ? `>\n${content}\n${indent}</${name}>` : ' />');
}

interface MdastToSvelteOptions {
	resolveId(id: string): string | undefined;
}

export function mdastToSvelteString(
	root: Parent,
	options: MdastToSvelteOptions,
) {
	const imports = new Imports();

	function processNode(node: RootContent, depth: number): string {
		if (node.type === 'blockquote') {
			const name = imports.add(ELEMENT_PATH, 'Blockquote');
			return component(name, {}, processParent(node, depth + 1), depth);
		}
		if (node.type === 'code') {
			return processCode(node, depth);
		}
		if (node.type === 'emphasis') {
			const name = imports.add(ELEMENT_PATH, 'Emphasis');
			return component(name, {}, processParent(node, depth + 1), depth);
		}
		if (node.type === 'heading') {
			const name = imports.add(ELEMENT_PATH, 'Heading');
			const props: Props = {
				attributes: { type: 'value', value: { id: node.data?.id } },
				rank: { type: 'value', value: node.depth },
			};
			return component(name, props, processParent(node, 0), depth);
		}
		if (node.type === 'html') {
			return `${'\t'.repeat(depth)}{@html ${JSON.stringify(node.value)}}`;
		}
		if (node.type === 'image') {
			const name = imports.add(ELEMENT_PATH, 'Image');
			const props: Props = {
				alt: { type: 'value', value: node.alt },
				src: { type: 'value', value: node.url },
			};
			return component(name, props, null, depth);
		}
		if (node.type === 'inlineCode') {
			const name = imports.add(ELEMENT_PATH, 'InlineCode');
			const lang = node.data?.attributes.lang;
			let highlighter = plaintext;
			if (isSupportedLanguage(lang)) {
				highlighter = SUPPORTED_LANGUAGES[lang];
			}

			const props: Props = {
				tokens: { type: 'value', value: highlighter(node.value) },
			};
			return component(name, props, null, depth);
		}
		if (node.type === 'link') {
			const name = imports.add(ELEMENT_PATH, 'Link');
			const props: Props = {
				href: { type: 'value', value: node.url },
				title: { type: 'value', value: node.title },
			};
			return component(name, props, processParent(node, depth + 1), depth);
		}
		if (node.type === 'list') {
			const name = imports.add(ELEMENT_PATH, 'List');
			const props: Props = {
				ordered: { type: 'value', value: node.ordered },
			};
			return component(name, props, processParent(node, depth + 1), depth);
		}
		if (node.type === 'listItem') {
			const name = imports.add(ELEMENT_PATH, 'ListItem');
			return component(name, {}, processParent(node, depth + 1), depth);
		}
		if (node.type === 'paragraph') {
			const name = imports.add(ELEMENT_PATH, 'Paragraph');
			return component(name, {}, processParent(node, depth + 1), depth);
		}
		if (node.type === 'strong') {
			const name = imports.add(ELEMENT_PATH, 'Strong');
			return component(name, {}, processParent(node, depth + 1), depth);
		}
		if (node.type === 'text') {
			return `${'\t'.repeat(depth)}${node.value}`;
		}
		if (node.type === 'thematicBreak') {
			const name = imports.add(ELEMENT_PATH, 'ThematicBreak');
			return component(name, {}, null, depth);
		}

		throw Error(`Unhandled node type: ${node.type}`);
	}

	function processCode(node: Code, depth: number) {
		const name = imports.add(ELEMENT_PATH, 'Code');
		const props: Props = {};
		if (node.data) {
			const { attributes } = node.data;
			const { copyRange, file, fileRange } = attributes;
			if (file) {
				const parts = [
					fileRange ? `range=${fileRange}` : '',
					'highlight',
					'lines',
				].filter(Boolean);
				const name = imports.add(
					`${options.resolveId(file) ?? file}?${parts.join('&')}`,
					'code',
					true,
				);
				props.lines = { type: 'scope-variable', value: name };
			} else {
				const { value, lang } = node;
				let highlighter = plaintext;
				if (isSupportedLanguage(lang)) {
					highlighter = SUPPORTED_LANGUAGES[lang];
				}
				props.lines = {
					type: 'value',
					value: highlightLines(value, highlighter),
				};
			}

			if ('copy' in attributes) {
				let text = node.value;
				const lines = text.split(/\r\n|\r|\n/);
				const lineCount = lines.length;
				let ranges: LineInterval[] = [[1, lineCount]];
				if (copyRange) {
					ranges = parseRanges(copyRange, lineCount);
					text = selectLines(lines, ranges).join('\n');
				}

				props.copyRanges = { type: 'value', value: ranges };
				props.copyText = { type: 'value', value: text };
			}
		}
		return component(name, props, null, depth);
	}

	function processParent(node: Parent, indentLevel: number): string {
		return node.children
			.map((child) => processNode(child, indentLevel))
			.join('\n');
	}

	const content = processParent(root, 0);
	let result =
		'\n<!--\n\tThis file is auto-generated. Do not edit directly.\n-->\n';
	result += '<script lang="ts">\n';
	result += imports.toString({ indent: '\t' }) + '\n';
	result += '</script>\n\n';
	result += content;

	return result;
}

const SUPPORTED_LANGUAGES = {
	cpp,
	css,
	html,
	json,
	python,
	rust,
	svelte,
	plaintext,
	txt: plaintext,
	text: plaintext,
	javascript: typescript,
	js: typescript,
	jsx: typescript,
	typescript,
	ts: typescript,
	tsx: typescript,
};
