const path = require('path')

const project = [
	'./tsconfig.json',
	path.join(__dirname, 'app/tsconfig.json'),
	path.join(__dirname, 'app-ugc/tsconfig.json'),
	path.join(__dirname, 'hub/tsconfig.json'),
	path.join(__dirname, 'hub-ugc/tsconfig.json'),
	path.join(__dirname, 'lrpc/tsconfig.json'),
	path.join(__dirname, 'shared/tsconfig.json'),
	path.join(__dirname, 'shared-dom/tsconfig.json'),
	path.join(__dirname, 'shared-edge/tsconfig.json'),
	path.join(__dirname, 'shared-edge/tsconfig.node.json'),
	path.join(__dirname, 'cwa/tsconfig.json'),
	path.join(__dirname, 'api-ugc/tsconfig.json'),
	path.join(__dirname, 'peer/tsconfig.json'),
	path.join(__dirname, 'workers-test/tsconfig.json'),
	path.join(__dirname, 'workers-test/test/tsconfig.json'),
	path.join(__dirname, 'example-plugins/solid/tsconfig.json'),
	path.join(__dirname, 'example-plugins/svelte/tsconfig.json'),
	path.join(__dirname, 'prosemirror-image-plugin/tsconfig.json'),
]

/* eslint-env node */
module.exports = {
	root: true,
	ignorePatterns: [
		'**/public/assets/*.js',
		'**/build.js',
		'**/sw.js',
		'**/*.config.js',
	],
	env: {
		browser: true,
		es2021: true,
	},
	reportUnusedDisableDirectives: true,
	extends: [
		'plugin:deprecation/recommended',
		'eslint:recommended',
		'plugin:prettier/recommended', // Last to disable conflicting rules
	],
	overrides: [
		{
			files: ['*.ts'],
			extends: [
				'standard-with-typescript',
				'plugin:@typescript-eslint/recommended',
				'plugin:@typescript-eslint/recommended-requiring-type-checking',
				'plugin:prettier/recommended', // Last to disable conflicting rules
			],
			plugins: ['@typescript-eslint', 'solid'],
			parser: '@typescript-eslint/parser',
			parserOptions: {
				project,
			},
			rules: {
				'@typescript-eslint/no-non-null-assertion': 'off',
				'@typescript-eslint/explicit-function-return-type': 'off',
				'@typescript-eslint/no-misused-promises': [
					'error',
					{
						checksVoidReturn: {
							arguments: false,
							attributes: false,
						},
					},
				],
				// https://typescript-eslint.io/rules/naming-convention/#enforce-the-codebase-follows-eslints-camelcase-conventions
				camelcase: 'off',
				'@typescript-eslint/naming-convention': [
					'error',
					{
						selector: 'default',
						format: ['camelCase'],
					},
					{
						selector: 'import',
						format: null,
					},
					{
						selector: 'variable',
						format: ['camelCase', 'UPPER_CASE'],
					},
					{
						selector: 'parameter',
						format: ['camelCase'],
						leadingUnderscore: 'allow',
					},
					{
						selector: 'memberLike',
						modifiers: ['private'],
						format: ['camelCase'],
						leadingUnderscore: 'require',
					},
					{
						selector: 'typeLike',
						format: ['PascalCase'],
					},
					// Exported function components should be PascalCase
					{
						selector: 'function',
						modifiers: ['exported'],
						format: ['camelCase', 'PascalCase'],
					},
				],
			},
		},
		{
			files: ['*.tsx'],
			extends: [
				'plugin:solid/typescript',
				'standard-with-typescript',
				'plugin:@typescript-eslint/recommended',
				'plugin:@typescript-eslint/recommended-requiring-type-checking',
				'plugin:prettier/recommended', // Last to disable conflicting rules
			],
			plugins: ['@typescript-eslint'],
			parser: '@typescript-eslint/parser',
			parserOptions: {
				project,
			},
			rules: {
				'@typescript-eslint/no-non-null-assertion': 'off',
				'@typescript-eslint/no-throw-literal': [
					'error',
					{
						allowThrowingUnknown: true,
					},
				],
				'@typescript-eslint/explicit-function-return-type': 'off',
				'@typescript-eslint/no-misused-promises': [
					'error',
					{
						checksVoidReturn: {
							arguments: false,
							attributes: false,
						},
					},
				],
				// https://typescript-eslint.io/rules/naming-convention/#enforce-the-codebase-follows-eslints-camelcase-conventions
				camelcase: 'off',
				'@typescript-eslint/naming-convention': [
					'error',
					{
						selector: 'default',
						format: ['camelCase'],
					},
					{
						selector: 'import',
						format: null,
					},
					{
						selector: 'variable',
						format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
					},
					{
						selector: 'parameter',
						format: ['camelCase'],
						leadingUnderscore: 'allow',
					},
					{
						selector: 'memberLike',
						modifiers: ['private'],
						format: ['camelCase'],
						leadingUnderscore: 'require',
					},
					{
						selector: 'typeLike',
						format: ['PascalCase'],
					},
					{
						selector: 'function',
						format: ['camelCase', 'PascalCase'],
						leadingUnderscore: 'allow',
					},
					// Exported function components should be PascalCase
					{
						selector: 'function',
						modifiers: ['exported'],
						format: ['camelCase', 'PascalCase'],
					},
					// Ignore properties that require quotes https://typescript-eslint.io/rules/naming-convention/#ignore-properties-that-require-quotes
					{
						selector: [
							'classProperty',
							'objectLiteralProperty',
							'typeProperty',
							'classMethod',
							'objectLiteralMethod',
							'typeMethod',
							'accessor',
							'enumMember',
						],
						format: null,
						modifiers: ['requiresQuotes'],
					},
				],
			},
		},
	],
}
