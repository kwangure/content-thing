import { highlight } from '../highlight.js';
import { parser } from '@fig/lezer-bash';

export const bash = highlight.bind(null, parser);
