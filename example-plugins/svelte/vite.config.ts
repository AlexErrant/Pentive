import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/guide/build#library-mode
export default defineConfig({
	plugins: [
		svelte({
			emitCss: false,
		}),
	],
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
