import type { CollectionConfig } from '../../config/types.js';
import type { Plugin } from '../../core/plugin.js';
import { cwd } from 'node:process';
import { mdastToSvelteString } from './mdastToSvelteString.js';
import { parseMarkdownSections } from './parse.js';
import { walk, write } from '@content-thing/internal-utils/filesystem';
import fs from 'node:fs';
import path from 'node:path';
import { parseFilepath } from '../../utils/filepath.js';
import { getHeadingTree } from './heading_tree.js';

export { mdastToString } from './mdastToString.js';

const README_RE = /(?:^|[/\\])readme\.md$/i;

function escapeRegExp(text: string) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export const markdownPlugin: Plugin = {
	name: 'content-thing-markdown',
	bundle(build) {
		const COLLECTIONS_ROOT_RE = new RegExp(
			`^${escapeRegExp(cwd())}[\\/\\\\]src[\\/\\\\]collections`,
		);

		build.transformCollectionConfig((config) => {
			if (config.type === 'markdown') {
				config.data.fields = {
					...config.data.fields,
					_id: {
						nullable: false,
						type: 'string',
					},
					_headingTree: {
						nullable: false,
						type: 'json',
						typeScriptType: "import('content-thing').TocEntry[]",
					},
					_content: {
						nullable: false,
						type: 'json',
						typeScriptType: "import('content-thing/mdast').Root",
					},
				};
			}
		});

		build.writeCollectionConfig(({ config, options }) => {
			if (config.type !== 'markdown') return;
			const baseFilePath = config.filepath
				.replace(COLLECTIONS_ROOT_RE, '')
				.replace(/collection\.config\.json$/, '');
			write(
				path.join(
					options.files.collectionsOutputDir,
					baseFilePath,
					'index.d.ts',
				),
				generateTypes(config),
			);
			write(
				path.join(options.files.collectionsOutputDir, baseFilePath, 'index.js'),
				`export {};`,
			);
		});

		build.loadCollectionItems(async ({ config, options }) => {
			const { filepath, type } = config;
			if (type !== 'markdown') return;

			const collectionDir = path.dirname(filepath);
			const markdownFilepaths: string[] = [];
			walk(collectionDir, (dirent) => {
				if (README_RE.test(dirent.name) && dirent.isFile()) {
					markdownFilepaths.push(path.join(dirent.path, dirent.name));
				}
			});

			for (const filepath of markdownFilepaths) {
				const value = fs.readFileSync(filepath, 'utf-8');
				const baseFilePath = filepath
					.replace(COLLECTIONS_ROOT_RE, '')
					.replace(README_RE, '');

				// TODO: Validate frontmatter by config
				const { entry } = parseFilepath(filepath);
				const { frontmatter, content } = await parseMarkdownSections(
					value,
					filepath,
				);
				const markdownAsSvelte = mdastToSvelteString(content);
				const svelteFilepath = path.join(
					options.files.collectionsMirrorDir,
					baseFilePath,
					'+page.svelte',
				);
				write(svelteFilepath, markdownAsSvelte as string);

				const markdownFrontmatter = generateFrontmatter(
					Object.assign(frontmatter, {
						_id: entry.id,
						_headingTree: getHeadingTree(content),
					}),
				);
				const frontmatterFilepath = path.join(
					options.files.collectionsMirrorDir,
					baseFilePath,
					'frontmatter.js',
				);
				write(frontmatterFilepath, markdownFrontmatter);
			}

			return markdownFilepaths;
		});
	},
};

function generateFrontmatter(record: Record<string, unknown>) {
	const __record = Object.assign({ _content: undefined }, record);
	let code = '// This file is auto-generated. Do not edit directly.\n';
	code += `export const frontmatter = JSON.parse(${JSON.stringify(JSON.stringify(__record))});\n`;
	return code;
}

function generateTypes(collectionConfig: CollectionConfig) {
	let code = '// This file is auto-generated. Do not edit directly.\n';
	code += `export interface Frontmatter {\n`;
	const fields = Object.entries(collectionConfig.data.fields);
	for (const [fieldName, field] of fields) {
		const type = 'typeScriptType' in field ? field.typeScriptType : field.type;
		code += `\t${fieldName}: ${type};\n`;
	}
	code += `};\n`;
	return code;
}
