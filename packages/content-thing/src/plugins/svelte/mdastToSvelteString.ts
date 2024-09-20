import type { Parent, RootContent } from 'mdast';

export function component(
	name: string,
	props: Record<string, unknown>,
	content: string | null,
	indentLevel: number,
	imports?: Set<string>,
): string {
	if (imports) imports.add(name);
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
	const imports = new Set<string>();

	function processNode(node: RootContent, depth: number): string {
		if (node.type === 'blockquote') {
			return component(
				'Blockquote',
				{},
				processParent(node, depth + 1),
				depth,
				imports,
			);
		}
		if (node.type === 'code') {
			const props = {
				attributes: node.data?.attributes,
				copyRanges: node.data?.copy?.ranges,
				copyText: node.data?.copy?.text,
				lines: node.data?.highlightedLines,
			};
			return component('Code', props, null, depth, imports);
		}
		if (node.type === 'emphasis') {
			return component(
				'Emphasis',
				{},
				processParent(node, depth + 1),
				depth,
				imports,
			);
		}
		if (node.type === 'heading') {
			const props = {
				attributes: { id: node.data?.id },
				rank: node.depth,
			};
			return component(
				'Heading',
				props,
				processParent(node, 0),
				depth,
				imports,
			);
		}
		if (node.type === 'html') {
			return `${'\t'.repeat(depth)}{@html ${JSON.stringify(node.value)}}`;
		}
		if (node.type === 'image') {
			const props = { alt: node.alt, src: node.url };
			return component('Image', props, null, depth, imports);
		}
		if (node.type === 'inlineCode') {
			const props = {
				attributes: node.data?.attributes,
				tokens: node.data?.highlightedTokens,
			};
			return component('InlineCode', props, null, depth, imports);
		}
		if (node.type === 'link') {
			const props = { href: node.url, title: node.title };
			return component(
				'Link',
				props,
				processParent(node, depth + 1),
				depth,
				imports,
			);
		}
		if (node.type === 'list') {
			return component(
				'List',
				{ ordered: node.ordered },
				processParent(node, depth + 1),
				depth,
				imports,
			);
		}
		if (node.type === 'listItem') {
			return component(
				'ListItem',
				{},
				processParent(node, depth + 1),
				depth,
				imports,
			);
		}
		if (node.type === 'paragraph') {
			return component(
				'Paragraph',
				{},
				processParent(node, depth + 1),
				depth,
				imports,
			);
		}
		if (node.type === 'strong') {
			return component(
				'Strong',
				{},
				processParent(node, depth + 1),
				depth,
				imports,
			);
		}
		if (node.type === 'text') {
			return `${'\t'.repeat(depth)}${node.value}`;
		}
		if (node.type === 'thematicBreak') {
			return component('ThematicBreak', {}, null, depth, imports);
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
		'<!--\n\tThis file is auto-generated. Do not edit directly.\n-->\n';
	result += '<script lang="ts">\n';
	if (imports.size > 0) {
		result += '\timport {\n';
		result += Array.from(imports)
			.map((imp) => `\t\t${imp},\n`)
			.join('');
		result += "\t} from '@svelte-thing/components/elements';\n";
	}
	result += '</script>\n\n';
	result += content;

	return result;
}
