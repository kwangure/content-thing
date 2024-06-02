<script lang="ts">
	import { InlineCode } from '@svelte-thing/components/elements';
	import type { InlineCode as MdastInlineCode } from 'mdast';

	export let node: MdastInlineCode;
</script>

<InlineCode
	attributes={node.data?.attributes}
	code={node.value}
	language={node.data?.attributes.lang}
/>
