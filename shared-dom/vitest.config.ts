import { defineConfig } from 'vitest/config'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
	plugins: [solidPlugin()],
	test: {
		environment: 'jsdom',
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/lib/**',
			'**/cypress/**',
			'**/.{idea,git,cache,output,temp}/**',
			'**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
		],
	},
	resolve: {
		conditions: ['development', 'browser'],
	},
})
