import { configDefaults, defineConfig } from 'vitest/config'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
	plugins: [solidPlugin()],
	test: {
		exclude: [...configDefaults.exclude, '**/lib/**'],
	},
})
