<script lang="ts">
	import { List } from '@svelte-thing/components/elements';
	import type { List as MdastList } from 'mdast';
	import Children from './children.svelte';

	export let node: MdastList;
</script>

<List ordered={node.ordered}><Children {node} /></List>
