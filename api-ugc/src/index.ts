/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:3017/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Hono } from "hono"
import { cors } from "hono/cors"
import { Env, ApiUgcContext } from "./util"
import {
  hstsName,
  hstsValue,
  Base64,
  setKysely,
  lookupMediaHash,
  binary16fromBase64URL,
  parsePublicToken,
} from "shared"
import { appRouter } from "./router"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { createContext } from "./trpc"

// eslint-disable-next-line @typescript-eslint/naming-convention
const app = new Hono<{ Bindings: Env }>()

app
  .use("*", async (c, next) => {
    await next()
    c.header(hstsName, hstsValue)
  })
  .use("/*", async (c, next) => {
    return await cors({
      origin: (x) =>
        c.env.hubOrigin === x || c.env.appOrigin === x ? x : null, // lowTODO replace at build time (doesn't need to be a secret)
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: [],
      maxAge: 86400, // 24hrs - browsers don't support longer https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age
      credentials: false,
      exposeHeaders: [],
    })(c, next)
  })
  .use("/trpc/*", async (c) => {
    setKysely(c.env.planetscaleDbUrl)
    return await fetchRequestHandler({
      endpoint: "/trpc",
      req: c.req,
      router: appRouter,
      createContext,
    })
  })
  .get("/", (c) => c.text("Hono!!"))
  .get("/i/:token", async (c) => {
    setKysely(c.env.planetscaleDbUrl)
    const [entityId, i] = parsePublicToken(c.req.param("token"))
    const entityIdBase64 = binary16fromBase64URL(entityId)
    const mediaHash = await lookupMediaHash(entityIdBase64, i)
    if (mediaHash == null) return await c.notFound()
    return await getMedia(c, mediaHash, "public")
  })

export default app

async function getMedia(
  c: ApiUgcContext,
  mediaIdBase64: Base64,
  cacheControl: "public" | "private"
): Promise<Response> {
  const file = await c.env.mediaBucket.get(mediaIdBase64)
  if (file === null) {
    return await c.notFound()
  }
  c.header("ETag", file.httpEtag)
  const maxAge =
    cacheControl === "public"
      ? 1814400 // 21 days
      : 31536000 // 1 year
  c.header("Expires", new Date(maxAge * 1000 + Date.now()).toUTCString())
  c.header("Cache-Control", `${cacheControl}, max-age=${maxAge}, immutable`)
  if (file.httpMetadata?.contentType != null)
    c.header("Content-Type", file.httpMetadata.contentType)
  if (file.httpMetadata?.contentEncoding != null)
    c.header("Content-Encoding", file.httpMetadata.contentEncoding)
  return c.body(file.body)
}
