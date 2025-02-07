import { defineConfig } from '@solidjs/start/config'

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
