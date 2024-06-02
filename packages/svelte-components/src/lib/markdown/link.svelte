<script lang="ts">
	import { Link } from '@svelte-thing/components/elements';
	import type { Link as MdastLink } from 'mdast';
	import Children from './children.svelte';

	export let node: MdastLink;
</script>

<Link href={node.url} title={node.title}>
	<Children {node} />
</Link>
