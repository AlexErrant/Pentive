import solid from "solid-start/vite"
import { defineConfig } from "vite"
import cloudflare from "solid-start-cloudflare-workers"
import fs from "fs"

export default defineConfig({
  plugins: [
    solid({
      adapter: cloudflare({ envPath: true }),
    }),
  ],
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
