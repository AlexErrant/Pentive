import { defineConfig } from 'vitest/config'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
	// nextTODO
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	plugins: [solidPlugin() as any],
	test: {
		environment: 'jsdom',
	},
	resolve: {
		conditions: ['development', 'browser'],
	},
})
