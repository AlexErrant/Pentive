import { defineConfig } from '@solidjs/start/config'
import checker from 'vite-plugin-checker'

export default defineConfig({
	middleware: './src/middleware.ts',
	server: {
		watchOptions: {
			ignored: [
				'**/.cert/**',
				'**/.turbo/**',
				'**/.vinxi/**',
				'**/.vscode/**',
				'**/dist/**',
				'**/distTest/**',
				'**/lib/**',
			],
		},
		preset: 'cloudflare_pages',
		rollupConfig: {
			external: ['__STATIC_CONTENT_MANIFEST', 'node:async_hooks'],
		},
		https: {
			key: './.cert/key.pem',
			cert: './.cert/cert.pem',
		},
		// analyze: { filename: 'visualizeBundle.html' },
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
			esbuild: {
				legalComments: 'none' as const, // we include sourcemaps which have the legal stuff
			},
			build: {
				sourcemap: true,
				assetsInlineLimit: 0,
			},
		}
	},
})
