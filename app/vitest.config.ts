import { configDefaults, defineConfig } from 'vitest/config'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
	plugins: [solidPlugin()],
	test: {
		exclude: [
			...configDefaults.exclude,
			'tests-examples/*',
			'tests/testdb.test.ts',
			'lib',
		],
		environment: 'jsdom',
	},
	resolve: {
		conditions: ['development', 'browser'],
	},
})
