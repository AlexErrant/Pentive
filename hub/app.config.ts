import { defineConfig } from '@solidjs/start/config'
import checker from 'vite-plugin-checker'

export default defineConfig({
	server: {
		preset: 'cloudflare-module',
		rollupConfig: {
			external: ['__STATIC_CONTENT_MANIFEST', 'node:async_hooks'],
		},
		https: {
			key: './.cert/key.pem',
			cert: './.cert/cert.pem',
		},
	},
	vite: () => {
		return {
			plugins: [
				checker({
					overlay: {
						initialIsOpen: false,
					},
					typescript: true,
					eslint: {
						lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
					},
				}),
			],
			build: {
				sourcemap: true,
			},
		}
	},
})
