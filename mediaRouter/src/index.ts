/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Hono } from "hono"

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  mediaBucket: R2Bucket
  mediaDb: D1Database
}
// eslint-disable-next-line @typescript-eslint/naming-convention
const app = new Hono<{ Bindings: Env }>()

app
  .get("/", (c) => c.text("Hono!!"))
  // highTODO needs sanitization and stripping of EXIF https://developers.cloudflare.com/workers/tutorials/generate-youtube-thumbnails-with-workers-and-images/ https://github.com/hMatoba/piexifjs https://github.com/hMatoba/exif-library
  // Someday B2? https://walshy.dev/blog/21_09_10-handling-file-uploads-with-cloudflare-workers https://news.ycombinator.com/item?id=28687181
  // Other alternatives https://bunny.net/ https://www.gumlet.com/ https://news.ycombinator.com/item?id=29474743
  .post("/:filename", async (c) => {
    if (c.req.body === null) {
      return c.text("Missing body", 400)
    }
    const contentLength = c.req.headers.get("content-length")
    if (contentLength === null) {
      return c.text("Missing `content-length` header", 400)
    }
    const contentLengthInt = parseInt(contentLength)
    if (isNaN(contentLengthInt)) {
      return c.text("`content-length` must be an int", 400)
    } else if (contentLengthInt <= 0) {
      return c.text("`content-length` must be larger than 0", 400)
    } else if (contentLengthInt > 2097152) {
      return c.text(
        "`content-length` must be less than 2,097,152 bytes (2 MB).",
        400
      )
    }

    const { readable, writable } = new FixedLengthStream( // validates length
      parseInt(contentLength)
    )
    void c.req.body.pipeTo(writable) // https://developers.cloudflare.com/workers/learning/using-streams
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const headers = new Headers({ "content-length": contentLength })
    const filename = c.req.param("filename") // highTODO needs validation
    await c.env.mediaBucket.put(filename, readable, {
      httpMetadata: headers,
    })
    return c.text("OK")
  })
  .get("/:filename", async (c) => {
    const filename = c.req.param("filename")
    const file = await c.env.mediaBucket.get(filename)
    if (file === null) {
      return await c.notFound()
    }
    return c.body(file.body)
  })

export default app
