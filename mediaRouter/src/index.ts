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
import { encryptDigest, decryptDigest, arrayBufferToBase64 } from "../util"

import {
  importPKCS8,
  importSPKI,
  SignJWT,
  jwtVerify,
  JWTVerifyResult,
} from "jose"

import { connect } from "@planetscale/database"

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  mediaBucket: R2Bucket
  jwsPublicKey: string
  jwsPrivateKey: string
  appMediaIdSecret: string
  planetscaleDbUrl: string
}
// eslint-disable-next-line @typescript-eslint/naming-convention
const app = new Hono<{ Bindings: Env }>()
const alg = "EdDSA"

app
  .get("/", (c) => c.text("Hono!!"))
  .get("/testJws", async (c) => {
    const publicKey = await importSPKI(c.env.jwsPublicKey, alg)
    const privateKey = await importPKCS8(c.env.jwsPrivateKey, alg)
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg })
      .setSubject("someUserName")
      // .setJti() // highTODO
      // .setNotBefore()
      // .setIssuedAt()
      // .setIssuer("urn:example:issuer")
      // .setAudience("urn:example:audience")
      // .setExpirationTime("2h")
      .sign(privateKey)
    const verifyResult = await jwtVerify(jwt, publicKey)
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
    const privateKey = await importPKCS8(c.env.jwsPrivateKey, alg)
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
      .sign(privateKey)
    console.log("jwt:", jwt)
    return c.body(null)
  })
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
    let userId: string
    const jwt = c.req.headers.get("Authorization")
    if (jwt == null) {
      return c.text("Missing `Authorization` header", 401)
    } else {
      const publicKey = await importSPKI(c.env.jwsPublicKey, alg)
      let verifyResult: JWTVerifyResult
      try {
        verifyResult = await jwtVerify(jwt, publicKey)
      } catch {
        return c.text("Failed to verify JWT in `Authorization` header.", 401)
      }
      if (verifyResult.payload.sub == null) {
        return c.text("There's no sub claim, ya goof.", 401)
      } else {
        userId = verifyResult.payload.sub
      }
    }

    const [responseBody, hashBody] = c.req.body.tee()
    const { readable, writable } = new FixedLengthStream( // validates length
      parseInt(contentLength)
    )
    void responseBody.pipeTo(writable) // https://developers.cloudflare.com/workers/learning/using-streams
    const headers = new Headers()
    const ct = c.req.headers.get("Content-Type")
    if (ct != null) headers.set("Content-Type", ct)
    const ce = c.req.headers.get("Content-Encoding")
    if (ce != null) headers.set("Content-Encoding", ce)
    const filename = c.req.param("filename") // highTODO needs validation

    const digestStream = new crypto.DigestStream("SHA-256") // https://developers.cloudflare.com/workers/runtime-apis/web-crypto/#constructors
    void hashBody.pipeTo(digestStream)
    const digest = await digestStream.digest
    const digestBase64 = arrayBufferToBase64(digest)

    const ivEncryptedDigest = await encryptDigest(
      c.env.appMediaIdSecret,
      digest
    )
    const txResponse = await connect({
      url: c.env.planetscaleDbUrl,
    }).transaction(async (tx) => {
      // Not a "real" transaction since the final `COMMIT` still needs to be sent as a fetch, but whatever.
      // Just means we could PUT something into the mediaBucket and have no record of it in PlanetScale. Not great, but _fine_.
      // lowTODO brainstorm a better architecture
      const countResponse = await tx.execute(
        "SELECT count(*) from Media_User WHERE mediaId=FROM_BASE64(?) AND userId=?",
        [digestBase64, userId],
        { as: "array" }
      )
      const count = (countResponse.rows[0] as string[])[0]
      if (count !== "0") {
        return c.text(
          "You've already uploaded this, or something exactly like it. See: " +
            ivEncryptedDigest, // Users can only upload an object exactly once. Otherwise, we won't know when it's safe to delete that object from R2.
          400
        )
      }
      await tx.execute(
        "INSERT INTO Media_User (mediaId, userId) VALUES (FROM_BASE64(?), ?)",
        [digestBase64, userId]
      )
      const object = await c.env.mediaBucket.put(digestBase64, readable, {
        httpMetadata: headers,
      })
      c.header("ETag", object.httpEtag)
    })
    return txResponse ?? c.text(ivEncryptedDigest, 201)
  })
  .get("/:ivEncryptedDigest", async (c) => {
    const digest = await decryptDigest(
      c.req.param("ivEncryptedDigest"),
      c.env.appMediaIdSecret
    )
    const file = await c.env.mediaBucket.get(digest)
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
