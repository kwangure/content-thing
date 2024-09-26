import type { Plugin } from '../../core/plugin.js';
import { stringifyData, stringifyTypes } from '../utils/stringify.js';
import { walk, write } from '@content-thing/internal-utils/filesystem';
import { cwd } from 'node:process';
import { escapeRegExp } from '../../utils/regex.js';
import { getHeadingTree } from './heading_tree.js';
import { mdastToSvelteString } from './mdastToSvelteString.js';
import { Ok } from '../../utils/result.js';
import { parseFilepath } from '../utils/filepath.js';
import { parseMarkdownSections } from './parse.js';
import fs from 'node:fs';
import path from 'node:path';

export { mdastToString } from './mdastToString.js';

const README_MD_RE = /(?:^|[/\\])readme\.md$/i;

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

			const { collectionsOutputDir } = options.files;
			const baseFilePath = path.join(
				collectionsOutputDir,
				config.filepath
					.replace(COLLECTIONS_ROOT_RE, '')
					.replace(/collection\.config\.json$/, ''),
			);
			write(path.join(baseFilePath, 'index.d.ts'), stringifyTypes(config));
			write(path.join(baseFilePath, 'index.js'), `export {};`);
		});

		build.resolveCollectionItems(({ config }) => {
			const { filepath, type } = config;
			if (type !== 'markdown') return;

			const collectionDir = path.dirname(filepath);
			const markdownFilepaths: string[] = [];
			walk(collectionDir, (dirent) => {
				if (README_MD_RE.test(dirent.name) && dirent.isFile()) {
					markdownFilepaths.push(path.join(dirent.path, dirent.name));
				}
			});

			return markdownFilepaths;
		});

		build.loadCollectionItem(async ({ config, filepath }) => {
			if (config.type !== 'markdown') return;

			const value = fs.readFileSync(filepath, 'utf-8');
			const { frontmatter, content } = await parseMarkdownSections(
				value,
				filepath,
			);

			return Ok({
				data: {
					...frontmatter,
					_id: parseFilepath(filepath).entry.id,
					_headingTree: getHeadingTree(content),
				},
				content: mdastToSvelteString(content),
			});
		});

		build.writeCollectionItem(
			({ config, content, data, filepath, options }) => {
				if (config.type !== 'markdown') return;

				const { collectionsMirrorDir } = options.files;
				const baseFilePath = path.join(
					collectionsMirrorDir,
					filepath.replace(COLLECTIONS_ROOT_RE, '').replace(README_MD_RE, ''),
				);

				write(path.join(baseFilePath, 'data.js'), stringifyData(data));

				if (content) {
					write(path.join(baseFilePath, '+page.svelte'), content);
				}
			},
		);
	},
};
