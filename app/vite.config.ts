import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import checker from "vite-plugin-checker"

export default defineConfig({
  plugins: [
    solidPlugin(),
    checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
      },
    }),
  ],
  build: {
    target: "esnext",
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
