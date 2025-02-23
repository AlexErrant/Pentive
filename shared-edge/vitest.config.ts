/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		exclude: [...configDefaults.exclude, '**/lib/**'],
		disableConsoleIntercept: true, // "stream" console output during a long test (instead of batching)
		reporters: process.env.GITHUB_ACTIONS
			? 'github-actions' //
			: 'basic', // https://github.com/vitest-dev/vscode/discussions/117#discussioncomment-8882237
		chaiConfig: {
			truncateThreshold: 0,
		},
	},
})
