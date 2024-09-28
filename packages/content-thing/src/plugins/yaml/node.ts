import type { Plugin } from '../../core/plugin.js';
import { stringifyData, stringifyTypes } from '../utils/stringify.js';
import { walk, write } from '@content-thing/internal-utils/filesystem';
import { cwd } from 'node:process';
import { escapeRegExp } from '../../utils/regex.js';
import { Ok } from '../../utils/result.js';
import { parseFilepath } from '../utils/filepath.js';
import { parseYaml } from '../../utils/parse.js';
import fs from 'node:fs';
import path from 'node:path';

const README_YAML_REGEXP = /(?:^|[/\\])readme\.(yaml|yml)$/i;
const COLLECTIONS_ROOT_RE = new RegExp(
	`^${escapeRegExp(cwd())}[\\/\\\\]src[\\/\\\\]collections`,
);

export const yamlPlugin: Plugin = {
	name: 'content-thing-yaml',
	bundle(build) {
		build.transformCollectionConfig((config) => {
			if (config.type === 'yaml') {
				config.fields = {
					...config.fields,
					_id: {
						nullable: false,
						type: 'string',
					},
				};
			}
		});

		build.writeCollectionConfig(({ config, options }) => {
			if (config.type !== 'yaml') return;

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
			if (config.type !== 'yaml') return;

			const collectionDir = path.dirname(config.filepath);
			const yamlFilepaths: string[] = [];
			walk(collectionDir, (dirent) => {
				if (README_YAML_REGEXP.test(dirent.name) && dirent.isFile()) {
					yamlFilepaths.push(path.join(dirent.path, dirent.name));
				}
			});

			return yamlFilepaths;
		});

		build.loadCollectionItem(({ config, filepath }) => {
			if (config.type !== 'yaml') return;

			const value = fs.readFileSync(filepath, 'utf-8');
			const parseResult = parseYaml(value);
			if (!parseResult.ok) return parseResult;

			return Ok({
				data: {
					...parseResult.value,
					_id: parseFilepath(filepath).entry.id,
				},
			});
		});

		build.writeCollectionItem(({ config, filepath, data, options }) => {
			if (config.type !== 'yaml') return;

			const { collectionsMirrorDir } = options.files;
			const baseFilePath = path.join(
				collectionsMirrorDir,
				filepath
					.replace(COLLECTIONS_ROOT_RE, '')
					.replace(README_YAML_REGEXP, ''),
			);

			write(path.join(baseFilePath, 'data.js'), stringifyData(data));
		});
	},
};
