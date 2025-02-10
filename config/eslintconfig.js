// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import { includeIgnoreFile } from '@eslint/compat'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import solid from 'eslint-plugin-solid/configs/typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * @param {string} importMetaUrl
 */
export function buildEslintConfig(importMetaUrl) {
	const projectDirname = path.dirname(fileURLToPath(importMetaUrl))
	const gitignorePath = path.resolve(__dirname, projectDirname, '.gitignore')
	return [
		...tseslint.config(
			eslint.configs.recommended,
			tseslint.configs.strictTypeChecked,
			tseslint.configs.stylisticTypeChecked,
			{
				rules: {
					eqeqeq: ['error', 'smart'],
					'@typescript-eslint/no-import-type-side-effects': 'error',
					'@typescript-eslint/consistent-type-imports': [
						'error',
						{ fixStyle: 'inline-type-imports' },
					],
					'@typescript-eslint/ban-ts-comment': [
						'error',
						{ minimumDescriptionLength: 1 },
					],
					'@typescript-eslint/restrict-template-expressions': [
						'error',
						{
							allowNumber: true,
						},
					],
					'@typescript-eslint/no-non-null-assertion': ['off'],
					'@typescript-eslint/array-type': [
						'error',
						{ default: 'array-simple' },
					],
					'@typescript-eslint/strict-boolean-expressions': [
						'error',
						{
							allowAny: false,
							allowNullableBoolean: false,
							allowNullableEnum: false,
							allowNullableNumber: false,
							allowNullableObject: false,
							allowNullableString: false,
							allowNumber: false,
							allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: false,
							allowString: false,
						},
					],
				},
			},
		),
		includeIgnoreFile(gitignorePath),
		solid,
		{
			ignores: [
				'**/public/assets/*.js',
				'**/build.js',
				'**/sw.js',
				'**/*.config.js',
				'**/*.config.cjs',
				'**/*.config.mjs',
			],
		},
		{
			files: ['**/*.tsx'],
			rules: {
				'@typescript-eslint/no-misused-promises': ['off'], // medTODO remove when fully moved to Tanstack Query
			},
		},
		{
			languageOptions: {
				parserOptions: {
					projectService: true,
					tsconfigRootDir: import.meta.dirname,
				},
			},
		},
	]
}
