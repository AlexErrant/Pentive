import { type BuildOptions, defineConfig } from 'vite'
import fs from 'fs'
import { VitePWA } from 'vite-plugin-pwa'

// https://www.reddit.com/r/vuejs/comments/o2p6l7/how_can_i_speed_build_vite_watch_build_even_futher/
const betterServiceWorkerDevExperience: BuildOptions = {
	minify: false,
	sourcemap: false,
	reportCompressedSize: false,
	rollupOptions: {
		treeshake: false,
		plugins: [
			{
				name: 'watch-external', // https://stackoverflow.com/a/63548394 force `npm run build-watch` to watch `sw.ts`, which isn't watched by default because it lives outside the module graph
				buildStart() {
					this.addWatchFile('src/serviceWorker.ts')
				},
			},
		],
	},
}

const configBuilder = ({
	devPort,
	testPort,
}: {
	devPort: number
	testPort: number
}) =>
	defineConfig(({ mode }) => {
		const baseBuild: BuildOptions = {
			target: 'ES2022',
			sourcemap: true,
		}
		const build: BuildOptions =
			mode === 'production'
				? baseBuild
				: {
						...betterServiceWorkerDevExperience,
						...baseBuild,
					}
		const serverOptions = {
			headers: {
				'Cross-Origin-Opener-Policy': 'same-origin',

				'Cross-Origin-Embedder-Policy': 'require-corp',

				'Cross-Origin-Resource-Policy': 'cross-origin',
			},
			port: mode === 'development' ? devPort : testPort,
			strictPort: true,
			https: {
				key: fs.readFileSync('./.cert/key.pem'),
				cert: fs.readFileSync('./.cert/cert.pem'),
			},
		}
		return {
			esbuild: {
				legalComments: 'none' as const, // we include sourcemaps which have the legal stuff
			},
			plugins: [
				// if we ever move off this plugin https://github.com/vitejs/vite/issues/2248
				VitePWA({
					strategies: 'injectManifest',
					injectRegister: null,
					srcDir: 'src',
					filename: 'serviceWorker.ts',
					injectManifest: {
						maximumFileSizeToCacheInBytes: 999999999999999,
					},
				}),
			],
			build,
			server: serverOptions,
			preview: serverOptions,
		}
	})

export default configBuilder
