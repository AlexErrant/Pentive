import { defineConfig } from '@solidjs/start/config'
import checker from 'vite-plugin-checker'
// import { loadEnv } from 'vite'
// import fs from 'fs'

const port = 3014

export default defineConfig({
	vite: () => {
		// const env = loadEnv(mode, process.cwd()) as ImportMetaEnv
		// const keyPath = './.cert/key.pem'
		// const certPath = './.cert/cert.pem'
		let key
		let cert
		// nextTODO
		// if (mode === 'development') {
		// 	key = fs.readFileSync(keyPath)
		// 	cert = fs.readFileSync(certPath)
		// }
		return {
			plugins: [
				// nextTODO
				// solid({
				// 	adapter: cloudflare({
				// 		envPath: true,
				// 		upstream:
				// 			mode === 'development'
				// 				? `https://${env.VITE_HUB_DOMAIN}:${port}`
				// 				: undefined,
				// 	}),
				// }),
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
			server: {
				port,
				strictPort: true,
				https: {
					key,
					cert,
				},
			},
		}
	},
})
