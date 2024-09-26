import { highlight } from '../highlight.js';
import { parser as rustParser } from '@lezer/rust';

export const rust = highlight.bind(null, rustParser);
