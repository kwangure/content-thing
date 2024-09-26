import { parser } from '@lezer/cpp';
import { highlight } from '../highlight.js';

export const cpp = highlight.bind(null, parser);
