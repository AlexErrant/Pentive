import { defineConfig } from "vite"
import checker from "vite-plugin-checker"
import fs from "fs"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    // if we ever move off this plugin https://github.com/vitejs/vite/issues/2248
    VitePWA({
      strategies: "injectManifest",
      injectRegister: null,
      srcDir: "src",
      filename: "service-worker.ts",
    }),
    checker({
      overlay: {
        initialIsOpen: false,
      },
      typescript: true,
      eslint: {
        lintCommand: 'eslint "./src/**/*.ts"',
      },
    }),
  ],
  build: {
    target: "esnext",
  },
  server: {
    port: 3015,
    strictPort: true,
    https: {
      key: fs.readFileSync("./.cert/key.pem"),
      cert: fs.readFileSync("./.cert/cert.pem"),
    },
  },
  preview: {
    port: 3015,
    strictPort: true,
    https: {
      key: fs.readFileSync("./.cert/key.pem"),
      cert: fs.readFileSync("./.cert/cert.pem"),
    },
  },
})
