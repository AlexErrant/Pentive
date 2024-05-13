import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		exclude: [
			...configDefaults.exclude,
			'tests-examples/*',
			'tests/testdb.test.ts',
			'lib',
		],
		environment: 'jsdom',
		pool: 'forks', // https://github.com/vitest-dev/vitest/issues/2008
	},
	resolve: {
		conditions: ['development', 'browser'],
	},
})
