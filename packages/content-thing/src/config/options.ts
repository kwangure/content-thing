import * as v from 'valibot';
import path from 'node:path';

function isRelativeOrAbsolute(value: string) {
	return (value[0] === '.' && value[1] === '/') || value[0] === '/';
}

const defaultConfig = {
	files: {
		collectionsDir: 'src/collections',
		outputDir: '.collections',
		routesDir: 'src/routes',
	},
};

const DirectoryFilepath = v.pipe(
	v.string(),
	v.nonEmpty(),
	v.check(
		(value) => !isRelativeOrAbsolute(value),
		(value) =>
			`Expected a path that is neither relative (starting with "./") or absolute (starting with "/"). Found "${value.input}" instead.`,
	),
);

export const ContentThingOptionsSchema = v.optional(
	v.object({
		files: v.optional(
			v.object({
				collectionsDir: v.optional(
					DirectoryFilepath,
					defaultConfig.files.collectionsDir,
				),
				outputDir: v.optional(DirectoryFilepath, defaultConfig.files.outputDir),
				routesDir: v.optional(DirectoryFilepath, defaultConfig.files.routesDir),
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
			const collectionsMirrorDir = path.join(
				rootDir,
				value.files.routesDir,
				'(collections)',
			);
			const outputDir = path.join(rootDir, value.files.outputDir);
			const collectionsOutputDir = path.join(outputDir, 'collections');
			return {
				...value,
				files: {
					...value.files,
					collectionsDir,
					collectionsMirrorDir,
					collectionsOutputDir,
					outputDir,
					rootDir,
				},
			};
		}),
	);
	return v.parse(WithRootDirSchema, value);
}
