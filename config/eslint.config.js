import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

const { browser, es2021, node } = globals;

/** @type {import('eslint').Linter.FlatConfig[]} */
const config = [
	{
		ignores: [
			'**/.svelte-kit/**/*',
			'**/.wireit/**/*',
			'**/node_modules/**',
			'**/dist/**',
		],
	},
	{
		files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
		languageOptions: {
			globals: {
				...browser,
				...es2021,
				...node,
			},
		},
		rules: {
			...js.configs.recommended.rules,
			'no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					args: 'all',
				},
			],
			'require-await': 'error',
			...prettier.rules,
		},
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			// @ts-expect-error
			parser: svelteParser,
			globals: {
				...browser,
				...es2021,
			},
		},
		plugins: {
			// @ts-expect-error
			svelte: sveltePlugin,
		},
		rules: {
			...js.configs.recommended.rules,
			.../** @type {import('eslint').Linter.RulesRecord} */ (
				sveltePlugin.configs.recommended.rules
			),
			'no-inner-declarations': 'off',
		},
	},
];

export default config;
