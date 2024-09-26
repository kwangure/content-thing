import { highlight } from '../highlight.js';
import { parser } from '@lezer/css';

export const css = highlight.bind(null, parser);
