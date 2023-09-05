import { EXIT, visit } from 'unist-util-visit';
import yaml from 'js-yaml';

/** @type {import('unified').Plugin<void[], import('mdast').Root>} */
export function remarkYamlParse() {
	return (tree) => {
		visit(tree, 'yaml', (node, index, parent) => {
			const parsedYaml = yaml.load(node.value);
			tree.data = {
				...tree.data,
				frontmatter: parsedYaml,
			};
			if (typeof index !== 'number' || !parent) return;

			parent.children.splice(index, 1);

			return EXIT;
		});
	};
}

export default remarkYamlParse;
