import { BuildOptions, defineConfig } from "vite"
import checker from "vite-plugin-checker"
import fs from "fs"
import { VitePWA } from "vite-plugin-pwa"

// https://www.reddit.com/r/vuejs/comments/o2p6l7/how_can_i_speed_build_vite_watch_build_even_futher/
const betterServiceWorkerDevExperience: BuildOptions = {
  minify: false,
  sourcemap: false,
  reportCompressedSize: false,
  watch: {},
  rollupOptions: {
    treeshake: false,
    plugins: [
      {
        name: "watch-external", // https://stackoverflow.com/a/63548394 force `npm run build-watch` to watch `sw.ts`, which isn't watched by default because it lives outside the module graph
        buildStart() {
          this.addWatchFile("src/service-worker.ts")
        },
      },
    ],
  },
}

export default defineConfig(({ command }) => {
  const baseBuild = {
    target: "ES2022",
  }
  const build: BuildOptions =
    command === "build" // is prod https://vitejs.dev/config/#conditional-config
      ? baseBuild
      : {
          ...betterServiceWorkerDevExperience,
          ...baseBuild,
        }
  return {
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
    build,
    server: {
      port: 3016,
      strictPort: true,
      https: {
        key: fs.readFileSync("./.cert/key.pem"),
        cert: fs.readFileSync("./.cert/cert.pem"),
      },
    },
    preview: {
      port: 3016,
      strictPort: true,
      https: {
        key: fs.readFileSync("./.cert/key.pem"),
        cert: fs.readFileSync("./.cert/cert.pem"),
      },
    },
  }
})
