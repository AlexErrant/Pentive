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
import { cors } from "hono/cors"
import { Env, getUserId, MediaId, MediaRouterContext } from "./util"
import {
  hstsName,
  hstsValue,
  base64,
  base64url,
  Base64,
  Base64Url,
  setKysely,
} from "shared"
import { SignJWT, jwtVerify } from "jose"
import { connect } from "@planetscale/database"
import { buildPrivateToken, getMediaId } from "./privateToken"
import { appRouter } from "./router"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { createContext } from "./trpc"
import { getJwsSecret } from "./env"

// eslint-disable-next-line @typescript-eslint/naming-convention
const app = new Hono<{ Bindings: Env }>()
const alg = "HS256"

app
  .use("*", async (c, next) => {
    await next()
    c.header(hstsName, hstsValue)
  })
  .use("/*", async (c, next) => {
    return await cors({
      origin: c.env.appOrigin, // lowTODO replace at build time (doesn't need to be a secret)
      allowMethods: ["POST", "GET", "OPTIONS"],
      allowHeaders: [],
      maxAge: 86400, // 24hrs - browsers don't support longer https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age
      credentials: true,
      exposeHeaders: [],
    })(c, next)
  })
  .use("/trpc/*", async (c) => {
    const userId = await getUserId(c)
    setKysely(c.env.planetscaleDbUrl)
    return await fetchRequestHandler({
      endpoint: "/trpc",
      req: c.req,
      router: appRouter,
      createContext: () => createContext(userId),
    })
  })
  .get("/", (c) => c.text("Hono!!"))
  .get("/testJws", async (c) => {
    const jwsSecretBytes = getJwsSecret(c.env.jwsSecret)
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg })
      .setSubject("someUserName")
      // .setJti() // highTODO
      // .setNotBefore()
      // .setIssuedAt()
      // .setIssuer("urn:example:issuer")
      // .setAudience("urn:example:audience")
      // .setExpirationTime("2h")
      .sign(jwsSecretBytes)
    const verifyResult = await jwtVerify(jwt, jwsSecretBytes)
    console.log(
      JSON.stringify(
        {
          ...verifyResult,
          jwt,
        },
        null,
        4
      )
    )
    return c.body(null, 200)
  })
  .get("/logJwt/:sub", async (c) => {
    const sub = c.req.param("sub")
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg })
      .setSubject(sub)
      // .setJti() // highTODO
      // .setNotBefore()
      // .setIssuedAt()
      // .setIssuer("urn:example:issuer")
      // .setAudience("urn:example:audience")
      // .setExpirationTime("2h")
      .sign(getJwsSecret(c.env.jwsSecret))
    console.log("jwt:", jwt)
    return c.body(null)
  })
  // highTODO needs sanitization and stripping of Exif https://developers.cloudflare.com/workers/tutorials/generate-youtube-thumbnails-with-workers-and-images/ https://github.com/hMatoba/piexifjs https://github.com/hMatoba/exif-library
  // Someday B2? https://walshy.dev/blog/21_09_10-handling-file-uploads-with-cloudflare-workers https://news.ycombinator.com/item?id=28687181
  // Other alternatives https://bunny.net/ https://www.gumlet.com/ https://news.ycombinator.com/item?id=29474743
  .post("/private", async (c) => {
    const authResult = await getUserId(c)
    if (authResult.tag === "Error") return authResult.error
    const userId = authResult.ok
    const buildToken = async (mediaId: MediaId): Promise<Base64Url> =>
      await buildPrivateToken(c.env.tokenSecret, mediaId, userId)
    const persistDbAndBucket = async ({
      mediaIdBase64,
      readable,
      headers,
    }: PersistParams): Promise<void> => {
      await connect({
        url: c.env.planetscaleDbUrl,
      }).transaction(async (tx) => {
        // Not a "real" transaction since the final `COMMIT` still needs to be sent as a fetch, but whatever.
        // Just means we could PUT something into the mediaBucket and have no record of it in PlanetScale. Not great, but _fine_.
        // Grep BC34B055-ECB7-496D-9E71-58EE899A11D1 for details.
        const countResponse = await tx.execute(
          `SELECT (SELECT COUNT(*) FROM Media_User WHERE mediaId=FROM_BASE64(?) AND userId=?),
                  (SELECT COUNT(*) FROM Media_User WHERE mediaId=FROM_BASE64(?))`,
          [mediaIdBase64, userId, mediaIdBase64],
          { as: "array" }
        )
        const userCount = (countResponse.rows[0] as string[])[0]
        const mediaCount = (countResponse.rows[0] as string[])[1]
        if (userCount === "0") {
          await tx.execute(
            "INSERT INTO Media_User (mediaId, userId) VALUES (FROM_BASE64(?), ?)",
            [mediaIdBase64, userId]
          )
          if (mediaCount === "0") {
            const object = await c.env.mediaBucket.put(
              mediaIdBase64,
              readable,
              {
                httpMetadata: headers,
              }
            )
            c.header("ETag", object.httpEtag)
          }
        }
      })
    }
    return await postMedia(c, persistDbAndBucket, buildToken)
  })
  .get("/private/:token", async (c) => {
    const authResult = await getUserId(c)
    if (authResult.tag === "Error") return authResult.error
    const userId = authResult.ok
    const mediaId = await getMediaId(
      c.env.tokenSecret,
      userId,
      base64url.decode(c.req.param("token"))
    )
    if (mediaId == null) return c.text("Invalid token", 400)
    const file = await c.env.mediaBucket.get(base64.encode(mediaId))
    if (file === null) {
      return await c.notFound()
    }
    c.header("ETag", file.httpEtag)
    c.header("Expires", new Date(31536000 * 1000 + Date.now()).toUTCString())
    // eslint-disable-next-line no-constant-condition
    const p = true ? "public" : "private" // nextTODO fix
    c.header("Cache-Control", `${p}, max-age=31536000, immutable`)
    if (file.httpMetadata?.contentType != null)
      c.header("Content-Type", file.httpMetadata.contentType)
    if (file.httpMetadata?.contentEncoding != null)
      c.header("Content-Encoding", file.httpMetadata.contentEncoding)
    return c.body(file.body)
  })

export default app

async function postMedia(
  c: MediaRouterContext,
  persistDbAndBucket: (_: PersistParams) => Promise<void>,
  buildResponse: (mediaId: MediaId) => string | Promise<string>
): Promise<Response> {
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

  const [responseBody, hashBody] = c.req.body.tee()
  const { readable, writable } = new FixedLengthStream(parseInt(contentLength)) // validates length
  void responseBody.pipeTo(writable) // https://developers.cloudflare.com/workers/learning/using-streams
  const headers = new Headers()
  const ct = c.req.headers.get("Content-Type")
  if (ct != null) headers.set("Content-Type", ct)
  const ce = c.req.headers.get("Content-Encoding")
  if (ce != null) headers.set("Content-Encoding", ce)

  const digestStream = new crypto.DigestStream("SHA-256") // https://developers.cloudflare.com/workers/runtime-apis/web-crypto/#constructors
  void hashBody.pipeTo(digestStream)
  const mediaId = new Uint8Array(await digestStream.digest) as MediaId
  const mediaIdBase64 = base64.encode(mediaId) as Base64

  const response = await buildResponse(mediaId)
  await persistDbAndBucket({ mediaIdBase64, readable, headers })
  return c.text(response, 201)
}

interface PersistParams {
  mediaIdBase64: Base64
  readable: ReadableStream<Uint8Array>
  headers: Headers
}
