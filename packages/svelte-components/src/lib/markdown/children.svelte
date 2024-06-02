<script>
	import Blockquote from './blockquote.svelte';
	import Code from './code.svelte';
	import Emphasis from './emphasis.svelte';
	import Heading from './heading.svelte';
	import Html from './html.svelte';
	import Image from './image.svelte';
	import InlineCode from './inline-code.svelte';
	import Link from './link.svelte';
	import List from './list.svelte';
	import ListItem from './list-item.svelte';
	import Paragraph from './paragraph.svelte';
	import Strong from './strong.svelte';
	import ThematicBreak from './thematic-break.svelte';
	import Text from './text.svelte';

	/** @type {import('mdast').Parent} */
	export let node;

	const ignore = ['yaml'];
	/**
	 * Return empty strings to skip rendering nodes
	 *
	 * @type {(node: { type: string }) => string}
	 */
	function notImplemented(node) {
		if (ignore.includes(node.type)) return '';
		console.warn(`'${node.type}' not yet implemented.`, node);
		return '';
	}
</script>

{#each node.children as child}
	{#if child.type === 'blockquote'}
		<Blockquote node={child} />
	{:else if child.type === 'code'}
		<Code node={child} />
	{:else if child.type === 'emphasis'}
		<Emphasis node={child} />
	{:else if child.type === 'heading'}
		<Heading node={child} />
	{:else if child.type === 'html'}
		<Html node={child} />
	{:else if child.type === 'image'}
		<Image node={child} />
	{:else if child.type === 'inlineCode'}
		<InlineCode node={child} />
	{:else if child.type === 'list'}
		<List node={child} />
	{:else if child.type === 'link'}
		<Link node={child} />
	{:else if child.type === 'listItem'}
		<ListItem node={child} />
	{:else if child.type === 'paragraph'}
		<Paragraph node={child} />
	{:else if child.type === 'strong'}
		<Strong node={child} />
	{:else if child.type === 'text'}
		<Text node={child} />
	{:else if child.type === 'thematicBreak'}
		<ThematicBreak />
	{:else}
		{notImplemented(child)}
	{/if}
{/each}
