import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"
import solidPlugin from "vite-plugin-solid"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    solidPlugin(),
    svelte({
      emitCss: false,
    }),
  ],
  build: {
    minify: false,
    target: "esnext",
    rollupOptions: {
      external: ["solid-js", "solid-js/web"],
    },
    lib: {
      entry: "src/index.ts",
      fileName: "index",
      formats: ["es"],
    },
  },
})
