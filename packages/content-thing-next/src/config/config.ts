import * as v from 'valibot';
import path from 'node:path';

function isNotRelativeOrAbsolute(value: string) {
	return value[0] === '.' || value[0] === '/';
}

function isNotRelativeOrAbsoluteMessage(value: v.CheckIssue<string>) {
	return `Expected a path that is not relative (starts with ".") or absolute (starts with "/"). Found "${value.input}" instead.`;
}

const defaultConfig = {
	files: {
		collectionsDir: 'src/collections',
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
			}),
			defaultConfig.files,
		),
	}),
	defaultConfig,
);

export type ContentThingOptions = v.InferInput<
	typeof ContentThingOptionsSchema
>;
export type ValidatedContentThingConfig = ReturnType<
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
		v.transform((value) => ({
			...value,
			files: {
				...value.files,
				collectionsDir: path.join(rootDir, value.files.collectionsDir),
				rootDir,
			},
		})),
	);
	return v.parse(WithRootDirSchema, value);
}
