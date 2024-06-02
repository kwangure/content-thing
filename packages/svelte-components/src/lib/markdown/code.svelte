<script lang="ts">
	import { Code } from '@svelte-thing/components/elements';
	import type { Code as MdastCode } from 'mdast';

	export let node: MdastCode;
</script>

<Code
	attributes={node.data?.attributes}
	copyRanges={node.data?.copy?.ranges}
	copyText={node.data?.copy?.text}
	lines={node.data?.highlightedLines ?? []}
/>
