<script lang="ts">
	import { Strong } from '@svelte-thing/components/elements';
	import type { Strong as MdastStrong } from 'mdast';
	import Children from './children.svelte';

	export let node: MdastStrong;
</script>

<Strong><Children {node} /></Strong>
