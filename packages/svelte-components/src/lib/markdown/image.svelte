<script lang="ts">
	import { Image } from '@svelte-thing/components/elements';
	import type { Image as MdastImage } from 'mdast';

	export let node: MdastImage;
</script>

<Image alt={node.alt} src={node.url} />
