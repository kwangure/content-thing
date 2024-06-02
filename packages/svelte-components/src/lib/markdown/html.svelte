<script lang="ts">
	/* eslint-disable svelte/no-at-html-tags */
	import type { Html } from 'mdast';
	export let node: Html;
</script>

{@html node.value}
