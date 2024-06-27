import delve from 'dlv';
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root } from 'mdast';

function hasValue<T extends object>(
	thing: T,
): thing is Extract<T, { value: unknown }> {
	return 'value' in thing;
}

export const remarkVariables: Plugin<void[], Root> = () => {
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
};

export default remarkVariables;
