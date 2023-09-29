import delve from 'dlv';
import { visit } from 'unist-util-visit';

/**
 * @template {Object} T
 * @param {T} thing
 * @returns {thing is Extract<T, { value: any }>}
 */
function hasValue(thing) {
	return 'value' in thing;
}

/** @type {import('unified').Plugin<void[], import('mdast').Root>} */
export function remarkVariables() {
	return (tree) => {
		const replacements = { ...tree.data };
		visit(tree, (node) => {
			if (!hasValue(node)) return;
			for (const match of node.value.matchAll(/{%\s*([0-9\w.]+)\s*%}/g)) {
				const path = match[1];
				const value = delve(replacements, path);
				if (value === undefined) {
					console.warn(`Markdown variable '${path}' accessed is not defined.`);
				}
				node.value = node.value.replace(match[0], value);
			}
		});
	};
}

export default remarkVariables;
