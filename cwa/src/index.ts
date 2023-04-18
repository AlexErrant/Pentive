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
import { type Env, getUserId, type MediaHash, type CwaContext } from "./util"
import {
  hstsName,
  hstsValue,
  base64,
  type Base64,
  type Base64Url,
  setKysely,
  db,
  fromBase64Url,
  fromBase64,
  type NoteId,
  userOwnsNoteAndHasMedia,
  type UserId,
  type TemplateId,
  userOwnsTemplateAndHasMedia,
  iByEntityIdsValidator,
} from "shared"
import { connect } from "@planetscale/database"
import { buildPrivateToken } from "./privateToken"
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
  .post("/private", async (c) => {
    const authResult = await getUserId(c)
    if (authResult.tag === "Error") return authResult.error
    const userId = authResult.ok
    const buildToken = async (mediaHash: MediaHash): Promise<Base64Url> =>
      await buildPrivateToken(c.env.mediaTokenSecret, mediaHash, userId)
    const persistDbAndBucket = async ({
      mediaHashBase64,
      readable,
      headers,
    }: PersistParams): Promise<undefined> => {
      await connect({
        url: c.env.planetscaleDbUrl,
      }).transaction(async (tx) => {
        // Not a "real" transaction since the final `COMMIT` still needs to be sent as a fetch, but whatever.
        // Just means we could PUT something into the mediaBucket and have no record of it in PlanetScale. Not great, but _fine_.
        // Grep BC34B055-ECB7-496D-9E71-58EE899A11D1 for details.
        const countResponse = await tx.execute(
          `SELECT (SELECT COUNT(*) FROM Media_User WHERE mediaHash=FROM_BASE64(?) AND userId=?),
                  (SELECT COUNT(*) FROM Media_User WHERE mediaHash=FROM_BASE64(?))`,
          [mediaHashBase64, userId, mediaHashBase64],
          { as: "array" }
        )
        const userCount = (countResponse.rows[0] as string[])[0]
        const mediaCount = (countResponse.rows[0] as string[])[1]
        if (userCount === "0") {
          await tx.execute(
            "INSERT INTO Media_User (mediaHash, userId) VALUES (FROM_BASE64(?), ?)",
            [mediaHashBase64, userId]
          )
          if (mediaCount === "0") {
            const object = await c.env.mediaBucket.put(
              mediaHashBase64,
              readable,
              {
                httpMetadata: headers,
              }
            )
            c.header("ETag", object.httpEtag)
          }
        }
      })
      return undefined
    }
    return await postMedia(c, persistDbAndBucket, buildToken)
  })
  .post("/media/note", async (c) => {
    const iByEntityIds = iByEntityIdsValidator.parse(c.req.query()) as Record<
      NoteId,
      number
    > // grep E7F24704-8D0B-460A-BF2C-A97344C535E0
    const noteIds = Object.keys(iByEntityIds) as NoteId[]
    if (noteIds.length === 0) return c.text(`Need at least one note.`, 400)
    return await postPublicMedia(
      c,
      "note",
      async (authorId: UserId, mediaHash: Base64) =>
        await userOwnsNoteAndHasMedia(noteIds, authorId, mediaHash),
      iByEntityIds
    )
  })
  .post("/media/template", async (c) => {
    const iByEntityIds = iByEntityIdsValidator.parse(c.req.query()) as Record<
      TemplateId,
      number
    > // grep E7F24704-8D0B-460A-BF2C-A97344C535E0
    const templateIds = Object.keys(iByEntityIds) as TemplateId[]
    if (templateIds.length === 0)
      return c.text(`Need at least one template.`, 400)
    return await postPublicMedia(
      c,
      "template",
      async (authorId: UserId, mediaHash: Base64) =>
        await userOwnsTemplateAndHasMedia(templateIds, authorId, mediaHash),
      iByEntityIds
    )
  })

export default app

async function postPublicMedia(
  c: CwaContext,
  type: "note" | "template",
  userOwnsAndHasMedia: (
    authorId: UserId,
    id: Base64
  ) => Promise<{
    userOwns: boolean
    hasMedia: boolean
  }>,
  iByEntityIds: Record<Base64Url, number>
) {
  const authResult = await getUserId(c)
  if (authResult.tag === "Error") return authResult.error
  const userId = authResult.ok
  setKysely(c.env.planetscaleDbUrl)
  const persistDbAndBucket = async ({
    mediaHashBase64,
    readable,
    headers,
  }: PersistParams): Promise<undefined | Response> => {
    const mediaHash = fromBase64(mediaHashBase64)
    const insertValues = Object.entries(iByEntityIds).map(([entityId, i]) => ({
      mediaHash,
      i,
      entityId: fromBase64Url(entityId as Base64Url),
    }))
    const { userOwns, hasMedia } = await userOwnsAndHasMedia(
      userId,
      mediaHashBase64
    )
    if (!userOwns)
      return c.text(`You don't own one (or more) of these ${type}s.`, 401)
    await db
      .transaction()
      // Not a "real" transaction since the final `COMMIT` still needs to be sent as a fetch, but whatever.
      // Just means we could PUT something into the mediaBucket and have no record of it in PlanetScale. Not great, but _fine_.
      // Grep BC34B055-ECB7-496D-9E71-58EE899A11D1 for details.
      .execute(async (trx) => {
        await trx
          .insertInto("media_Entity")
          .values(insertValues)
          .onDuplicateKeyUpdate({ mediaHash })
          .execute()
        if (!hasMedia) {
          const object = await c.env.mediaBucket.put(
            mediaHashBase64,
            readable,
            {
              httpMetadata: headers,
            }
          )
          c.header("ETag", object.httpEtag)
        }
      })
  }
  return await postMedia(c, persistDbAndBucket, () => "")
}

async function postMedia(
  c: CwaContext,
  persistDbAndBucket: (_: PersistParams) => Promise<undefined | Response>,
  buildResponse: (mediaHash: MediaHash) => string | Promise<string>
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
  const mediaHash = new Uint8Array(await digestStream.digest) as MediaHash
  const mediaHashBase64 = base64.encode(mediaHash) as Base64

  const response = await buildResponse(mediaHash)
  const r = await persistDbAndBucket({
    mediaHashBase64,
    readable,
    headers,
  })
  if (r != null) return r
  return c.text(response, 201)
}

interface PersistParams {
  mediaHashBase64: Base64
  readable: ReadableStream<Uint8Array>
  headers: Headers
}
