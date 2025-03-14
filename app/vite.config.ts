import {
	defineConfig,
	type UserConfig,
	loadEnv,
	type ServerOptions,
} from 'vite'
import { resolve } from 'path'
import solidPlugin from 'vite-plugin-solid'
import fs from 'fs'
import { VitePWA } from 'vite-plugin-pwa'
import { throwExp } from 'shared/utility'

export default defineConfig(({ mode }: UserConfig) => {
	// grep 3FBCE1B6-ABA3-4179-80B3-A965F8D087BC
	// We're using the version number due to https://developer.chrome.com/docs/workbox/service-worker-deployment/#its-all-in-the-timing:~:text=Problems%20arise%20in%20situations%20when%20unversioned%20static%20assets%20are%20cached
	const define = Object.fromEntries(
		fs
			.readdirSync('./public/assets/')
			.map((file) => [
				'import.meta.env.' + file.split('.').at(0)! + 'Path',
				`"/assets/${file}"`,
			]),
	) as Record<string, string>
	const env = loadEnv(mode ?? throwExp(), process.cwd()) as ImportMetaEnv
	const appOrigin = new URL(env.VITE_APP_ORIGIN)
	const serverOptions = {
		watch: {
			ignored: [
				'**/.cert/**',
				'**/.turbo/**',
				'**/.vscode/**',
				'**/dist/**',
				'**/distTest/**',
				'**/lib/**',
				'**/tests/**',
			],
		},
		port: parseInt(appOrigin.port),
		strictPort: true,
		https: {
			key: fs.readFileSync('./.cert/key.pem'),
			cert: fs.readFileSync('./.cert/cert.pem'),
		},
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',

			'Cross-Origin-Embedder-Policy': 'require-corp',

			'Cross-Origin-Resource-Policy': 'cross-origin',
		},
	} satisfies ServerOptions
	return {
		define,
		esbuild: {
			drop: mode === 'development' ? [] : ['debugger' as const],
			legalComments: 'none' as const, // we include sourcemaps which have the legal stuff
		},
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
		],
		optimizeDeps: {
			exclude: ['fsrs-browser'], // https://github.com/vitejs/vite/issues/8427
			esbuildOptions: {
				target: 'esnext',
			},
		},
		build: {
			target: 'ES2022',
			sourcemap: true,
			rollupOptions: {
				external: [
					'solid-js',
					'solid-js/web',
					'solid-js/store',
					'@solidjs/router',
				],
				// https://vitejs.dev/guide/build.html#multi-page-app
				input: {
					main: resolve(__dirname, 'index.html'),
					hubmessenger: resolve(__dirname, 'hubmessenger.html'),
				},
			},
		},
		resolve: {
			alias: {
				'~': resolve(__dirname, './src'),
			},
		},
		server: serverOptions,
		preview: serverOptions,
	}
})
