import { resolve } from "path"
import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import checker from "vite-plugin-checker"

export default defineConfig({
  plugins: [
    solidPlugin(),
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
    target: "esnext",
    rollupOptions: {
      // https://vitejs.dev/guide/build.html#multi-page-app
      input: {
        main: resolve(__dirname, "index.html"),
        nested: resolve(__dirname, "secure/index.html"),
      },
    },
  },
  server: {
    port: 3014,
    strictPort: true,
  },
  preview: {
    port: 3014,
    strictPort: true,
  },
})
