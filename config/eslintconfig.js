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
			tseslint.configs.recommended,
		),
		includeIgnoreFile(gitignorePath),
		solid,
	]
}
