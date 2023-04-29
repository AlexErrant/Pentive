import solid from "solid-start/vite"
import checker from "vite-plugin-checker"
import { defineConfig, loadEnv } from "vite"
import cloudflare from "solid-start-cloudflare-workers"
import fs from "fs"

const port = 3014

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd()) as ImportMetaEnv
  return {
    plugins: [
      solid({
        adapter: cloudflare({
          envPath: true,
          upstream:
            mode === "development"
              ? `https://${env.VITE_HUB_DOMAIN}:${port}`
              : undefined,
        }),
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
    server: {
      port,
      strictPort: true,
      https: {
        key: fs.readFileSync("./.cert/key.pem"),
        cert: fs.readFileSync("./.cert/cert.pem"),
      },
    },
    preview: {
      port,
      strictPort: true,
      https: {
        key: fs.readFileSync("./.cert/key.pem"),
        cert: fs.readFileSync("./.cert/cert.pem"),
      },
    },
  }
})
