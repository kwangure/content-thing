import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { CollectionConfig } from '../../config/types.js';
import type { Plugin } from '../../core/plugin.js';
import { cwd } from 'node:process';
import { parseFilepath } from '../../utils/filepath.js';
import { walk, write } from '@content-thing/internal-utils/filesystem';

const README_YAML_REGEXP = /(?:^|[/\\])readme\.(yaml|yml)$/i;

function escapeRegExp(text: string) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

const COLLECTIONS_ROOT_RE = new RegExp(
	`^${escapeRegExp(cwd())}[\\/\\\\]src[\\/\\\\]collections`,
);

export const yamlPlugin: Plugin = {
	name: 'content-thing-yaml',
	bundle(build) {
		build.transformCollectionConfig((config) => {
			if (config.type === 'yaml') {
				config.data.fields = {
					...config.data.fields,
					_id: {
						nullable: false,
						type: 'string',
					},
				};
			}
		});

		build.writeCollectionConfig(({ config, options }) => {
			const { filepath, type } = config;
			if (type !== 'yaml') return;
			const baseFilePath = filepath
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

		build.loadCollectionItems(({ config, options }) => {
			const { filepath, type } = config;
			if (type !== 'yaml') return;

			const collectionDir = path.dirname(filepath);
			const yamlFilepaths: string[] = [];
			walk(collectionDir, (dirent) => {
				if (README_YAML_REGEXP.test(dirent.name) && dirent.isFile()) {
					yamlFilepaths.push(path.join(dirent.path, dirent.name));
				}
			});

			for (const filepath of yamlFilepaths) {
				const baseFilePath = filepath
					.replace(COLLECTIONS_ROOT_RE, '')
					.replace(README_YAML_REGEXP, '');
				const value = fs.readFileSync(filepath, 'utf-8');
				// TODO: Handle malformed YAML
				const frontmatter = YAML.parse(value);

				const { entry } = parseFilepath(filepath);
				const yamlFrontmatter = generateFrontmatter(
					Object.assign(frontmatter, {
						_id: entry.id,
					}),
				);
				const frontmatterFilepath = path.join(
					options.files.collectionsMirrorDir,
					baseFilePath,
					'frontmatter.js',
				);
				write(frontmatterFilepath, yamlFrontmatter);
			}
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
