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
    https: {
      key: fs.readFileSync("./.cert/key.pem"),
      cert: fs.readFileSync("./.cert/cert.pem"),
    },
  },
  preview: {
    https: {
      key: fs.readFileSync("./.cert/key.pem"),
      cert: fs.readFileSync("./.cert/cert.pem"),
    },
  },
})
