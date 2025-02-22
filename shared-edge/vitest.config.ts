import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		exclude: [...configDefaults.exclude, '**/lib/**'],
		chaiConfig: {
			truncateThreshold: 0,
		},
	},
})
