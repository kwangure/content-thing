import { highlight } from '../highlight.js';
import { parser as jsonParser } from '@lezer/json';

export const json = highlight.bind(null, jsonParser);
