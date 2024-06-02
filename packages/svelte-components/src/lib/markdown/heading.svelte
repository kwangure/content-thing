<script lang="ts">
	import { Heading } from '@svelte-thing/components/elements';
	import type { Heading as MdastHeading } from 'mdast';
	import Children from './children.svelte';

	export let node: MdastHeading;
</script>

<Heading attributes={{ id: node.data?.id }} rank={node.depth}>
	<Children {node} />
</Heading>
