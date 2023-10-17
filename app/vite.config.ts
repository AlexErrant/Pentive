import { defineConfig, type UserConfig } from 'vite'
import { resolve } from 'path'
import solidPlugin from 'vite-plugin-solid'
import checker from 'vite-plugin-checker'
import fs from 'fs'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }: UserConfig) => {
	const keyPath = './.cert/key.pem'
	const certPath = './.cert/cert.pem'
	let key
	let cert
	if (mode === 'development') {
		key = fs.readFileSync(keyPath)
		cert = fs.readFileSync(certPath)
	}
	return {
		plugins: [
			solidPlugin(),
			// if we ever move off this plugin https://github.com/vitejs/vite/issues/2248
			VitePWA({
				strategies: 'injectManifest',
				injectManifest: {
					globPatterns: ['**/*.{js,css,html,ico,wasm}'],
					maximumFileSizeToCacheInBytes: 999999999999999,
				},
				injectRegister: null,
				srcDir: 'src',
				filename: 'serviceWorker.ts',
				devOptions: {
					enabled: mode === 'development',
				},
			}),
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
		optimizeDeps: {
			esbuildOptions: {
				target: 'esnext',
			},
		},
		build: {
			target: 'ES2022',
			sourcemap: true,
			rollupOptions: {
				external: ['solid-js', 'solid-js/web', '@solidjs/router'],
				// https://vitejs.dev/guide/build.html#multi-page-app
				input: {
					main: resolve(__dirname, 'index.html'),
					hubmessenger: resolve(__dirname, 'hubmessenger.html'),
				},
			},
		},
		resolve: {
			alias: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				'~': resolve(__dirname, './src'),
			},
		},
		server: {
			port: 3013,
			strictPort: true,
			https: {
				key,
				cert,
			},
		},
		preview: {
			port: 3013,
			strictPort: true,
			https: {
				key,
				cert,
			},
		},
	}
})
