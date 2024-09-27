import type { Parent, RootContent } from 'mdast';
import { Imports } from './imports.js';

const ELEMENT_PATH = '@svelte-thing/components/elements';

export function component(
	name: string,
	props: Record<string, unknown>,
	content: string | null,
	indentLevel: number,
): string {
	const indent = '\t'.repeat(indentLevel);
	const propEntries = Object.entries(props).filter(([, value]) => {
		if (value === null || value === undefined) return false;
		if (Array.isArray(value) && value.length === 0) return false;
		if (typeof value === 'object' && Object.keys(value).length === 0)
			return false;
		return true;
	});

	let result = `${indent}<${name}`;

	if (propEntries.length > 0) {
		const formattedAttrs = propEntries.map(
			([key, value]) => `${key}={${JSON.stringify(value)}}`,
		);

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

export function mdastToSvelteString(root: Parent) {
	const imports = new Imports();

	function processNode(node: RootContent, depth: number): string {
		if (node.type === 'blockquote') {
			const name = imports.add(ELEMENT_PATH, 'Blockquote');
			return component(name, {}, processParent(node, depth + 1), depth);
		}
		if (node.type === 'code') {
			const name = imports.add(ELEMENT_PATH, 'Code');
			const props = {
				attributes: node.data?.attributes,
				copyRanges: node.data?.copy?.ranges,
				copyText: node.data?.copy?.text,
				lines: node.data?.highlightedLines,
			};
			return component(name, props, null, depth);
		}
		if (node.type === 'emphasis') {
			const name = imports.add(ELEMENT_PATH, 'Emphasis');
			return component(name, {}, processParent(node, depth + 1), depth);
		}
		if (node.type === 'heading') {
			const name = imports.add(ELEMENT_PATH, 'Heading');
			const props = {
				attributes: { id: node.data?.id },
				rank: node.depth,
			};
			return component(name, props, processParent(node, 0), depth);
		}
		if (node.type === 'html') {
			return `${'\t'.repeat(depth)}{@html ${JSON.stringify(node.value)}}`;
		}
		if (node.type === 'image') {
			const name = imports.add(ELEMENT_PATH, 'Image');
			const props = { alt: node.alt, src: node.url };
			return component(name, props, null, depth);
		}
		if (node.type === 'inlineCode') {
			const name = imports.add(ELEMENT_PATH, 'InlineCode');
			const props = {
				attributes: node.data?.attributes,
				tokens: node.data?.highlightedTokens,
			};
			return component(name, props, null, depth);
		}
		if (node.type === 'link') {
			const name = imports.add(ELEMENT_PATH, 'Link');
			const props = { href: node.url, title: node.title };
			return component(name, props, processParent(node, depth + 1), depth);
		}
		if (node.type === 'list') {
			const name = imports.add(ELEMENT_PATH, 'List');
			return component(
				name,
				{ ordered: node.ordered },
				processParent(node, depth + 1),
				depth,
			);
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

	function processParent(node: Parent, indentLevel: number): string {
		return node.children
			.map((child) => processNode(child, indentLevel))
			.join('\n');
	}

	const content = processParent(root, 0);
	let result =
		'\n<!--\n\tThis file is auto-generated. Do not edit directly.\n-->\n';
	result += '<script lang="ts">\n';
	result += '\t' + imports.toString() + '\n';
	result += '</script>\n\n';
	result += content;

	return result;
}
