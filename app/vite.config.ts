import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import checker from "vite-plugin-checker"
import fs from "fs"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    solidPlugin(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "service-worker.ts",
      injectManifest: {
        maximumFileSizeToCacheInBytes: 999999999999999,
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
      target: "esnext",
    },
  },
  build: {
    target: "esnext",
  },
  server: {
    port: 3014,
    strictPort: true,
    https: {
      key: fs.readFileSync("./.cert/key.pem"),
      cert: fs.readFileSync("./.cert/cert.pem"),
    },
  },
  preview: {
    port: 3014,
    strictPort: true,
    https: {
      key: fs.readFileSync("./.cert/key.pem"),
      cert: fs.readFileSync("./.cert/cert.pem"),
    },
  },
})
