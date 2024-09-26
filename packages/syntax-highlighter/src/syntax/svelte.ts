import { highlight } from '../highlight.js';
import { svelteLanguage } from '@replit/codemirror-lang-svelte';

export const svelte = highlight.bind(null, svelteLanguage.parser);
