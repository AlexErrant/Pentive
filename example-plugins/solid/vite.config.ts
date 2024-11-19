import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

// https://vite.dev/guide/build#library-mode
export default defineConfig({
	plugins: [solidPlugin()],
	server: {
		port: 3000,
	},
	build: {
		minify: false,
		target: 'esnext',
		rollupOptions: {
			external: ['solid-js', 'solid-js/web', '@solidjs/router'],
		},
		lib: {
			entry: 'src/index.ts',
			fileName: 'index',
			formats: ['es'],
		},
	},
})
