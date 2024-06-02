<script lang="ts">
	import { Emphasis } from '@svelte-thing/components/elements';
	import type { Emphasis as MdastEmphasis } from 'mdast';
	import Children from './children.svelte';

	export let node: MdastEmphasis;
</script>

<Emphasis><Children {node} /></Emphasis>
