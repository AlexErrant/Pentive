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
			VitePWA({
				strategies: 'generateSW',
				workbox: {
					globPatterns: ['**/*.{js,css,html,ico,wasm}'],
					maximumFileSizeToCacheInBytes: 999999999999999,
				},
				srcDir: 'src',
				filename: 'serviceWorker.js',
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
			target: 'esnext',
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
