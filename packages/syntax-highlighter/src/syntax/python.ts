import { highlight } from '../highlight.js';
import { parser as pythonParser } from '@lezer/python';

export const python = highlight.bind(null, pythonParser);
