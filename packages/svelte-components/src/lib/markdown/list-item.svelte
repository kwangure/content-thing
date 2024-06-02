<script lang="ts">
	import { ListItem } from '@svelte-thing/components/elements';
	import type { ListItem as MdastListItem } from 'mdast';
	import Children from './children.svelte';

	export let node: MdastListItem;
</script>

<ListItem><Children {node} /></ListItem>
