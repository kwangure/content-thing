import * as v from 'valibot';
import path from 'node:path';

function isRelativeOrAbsolute(value: string) {
	return (value[0] === '.' && value[1] === '/') || value[0] === '/';
}
function isNotRelativeOrAbsolute(value: string) {
	return !isRelativeOrAbsolute(value);
}

function isNotRelativeOrAbsoluteMessage(value: v.CheckIssue<string>) {
	return `Expected a path that is not relative (starts with ".") or absolute (starts with "/"). Found "${value.input}" instead.`;
}

const defaultConfig = {
	files: {
		collectionsDir: 'src/collections',
		outputDir: '.svelte-kit/content-thing',
	},
};

export const ContentThingOptionsSchema = v.optional(
	v.object({
		files: v.optional(
			v.object({
				collectionsDir: v.optional(
					v.pipe(
						v.string(),
						v.nonEmpty(),
						v.check(isNotRelativeOrAbsolute, isNotRelativeOrAbsoluteMessage),
					),
					defaultConfig.files.collectionsDir,
				),
				outputDir: v.optional(
					v.pipe(
						v.string(),
						v.nonEmpty(),
						v.check(isNotRelativeOrAbsolute, isNotRelativeOrAbsoluteMessage),
					),
					defaultConfig.files.outputDir,
				),
			}),
			defaultConfig.files,
		),
	}),
	defaultConfig,
);

export type ContentThingOptions = v.InferInput<
	typeof ContentThingOptionsSchema
>;
export type ValidatedContentThingOptions = ReturnType<
	typeof parseContentThingOptions
>;

export interface ParseOptions {
	rootDir: string;
}

export function parseContentThingOptions(
	value: ContentThingOptions,
	options: ParseOptions,
) {
	const { rootDir } = options;
	const WithRootDirSchema = v.pipe(
		ContentThingOptionsSchema,
		v.transform((value) => {
			const collectionsDir = path.join(rootDir, value.files.collectionsDir);
			const outputDir = path.join(rootDir, value.files.outputDir);
			const collectionsOutputDir = path.join(outputDir, 'collections');
			const dbFilepath = path.join(outputDir, 'sqlite.db');
			return {
				...value,
				files: {
					...value.files,
					collectionsDir,
					collectionsOutputDir,
					outputDir,
					dbFilepath,
					rootDir,
				},
			};
		}),
	);
	return v.parse(WithRootDirSchema, value);
}
