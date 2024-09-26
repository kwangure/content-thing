import { parser as cssParser } from '@lezer/css';
import { highlight } from '../highlight.js';
import { parser as htmlParser } from '@lezer/html';
import { parser as jsParser } from '@lezer/javascript';
import { parseMixed } from '@lezer/common';

const mixedHTMLParser = htmlParser.configure({
	wrap: parseMixed((/** @type {{ name: string; }} */ node) => {
		if (node.name == 'ScriptText') {
			return { parser: jsParser };
		} else if (node.name == 'StyleText') {
			return { parser: cssParser };
		}

		return null;
	}),
});

export const html = highlight.bind(null, mixedHTMLParser);
