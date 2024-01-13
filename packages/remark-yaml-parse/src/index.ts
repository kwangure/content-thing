import { EXIT, visit } from 'unist-util-visit';
import yaml from 'js-yaml';
import type { Plugin } from 'unified';
import type { Root } from 'mdast';

export const remarkYamlParse: Plugin<void[], Root> = () => {
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
};

export default remarkYamlParse;
