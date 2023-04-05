import { Context } from "hono"
import { jwtVerify, JWTVerifyResult } from "jose"
import { Base64, Brand, csrfHeaderName, jwtCookieName } from "shared"
import { getJwsSecret } from "./env"
import { MediaTokenSecretBase64 } from "./privateToken"

export type Result<TOk, TError> =
  | {
      readonly tag: "Ok"
      readonly ok: TOk
    }
  | {
      readonly tag: "Error"
      readonly error: TError
    }

export function toOk<T>(ok: T): { tag: "Ok"; ok: T } {
  return {
    tag: "Ok",
    ok,
  }
}

export function toError<T>(error: T): { tag: "Error"; error: T } {
  return {
    tag: "Error",
    error,
  }
}

// https://gist.github.com/72lions/4528834
export function concat(a1: Uint8Array, a2: ArrayBuffer): Uint8Array {
  const tmp = new Uint8Array(a1.byteLength + a2.byteLength)
  tmp.set(a1, 0)
  tmp.set(new Uint8Array(a2), a1.byteLength)
  return tmp
}

export type MediaHash = Brand<Uint8Array, "mediaHash">
export type UserId = Brand<string, "userId">

export type CwaContext = Context<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Bindings: Env
  },
  unknown
>

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  mediaBucket: R2Bucket
  jwsSecret: string
  authJsSecret: Base64
  mediaTokenSecret: MediaTokenSecretBase64
  planetscaleDbUrl: string
  appOrigin: string
  hubOrigin: string
}

export async function getUserId(
  c: CwaContext
): Promise<Result<UserId, Response>> {
  // https://github.com/honojs/hono/pull/884
  if (c.req.header(csrfHeaderName) == null) {
    return toError(c.text(`Missing '${csrfHeaderName}' header`, 401))
  }
  const jwt = c.req.cookie(jwtCookieName)
  if (jwt == null) {
    return toError(c.text(`Missing '${jwtCookieName}' cookie.`, 401))
  } else {
    let verifyResult: JWTVerifyResult
    try {
      verifyResult = await jwtVerify(jwt, getJwsSecret(c.env.jwsSecret))
    } catch {
      return toError(
        c.text(`Failed to verify JWT in '${jwtCookieName}' cookie.`, 401)
      )
    }
    if (verifyResult.payload.sub == null) {
      return toError(c.text("There's no sub claim, ya goof.", 401))
    } else {
      return toOk(verifyResult.payload.sub as UserId)
    }
  }
}
