import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte({
      emitCss: false,
    }),
  ],
  build: {
    minify: false,
    target: "esnext",
    lib: {
      entry: "src/index.ts",
      fileName: "index",
      formats: ["es"],
    },
  },
})
