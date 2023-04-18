import { jwtVerify } from "jose"
import { jwsSecret } from "./config.js"
import { parse } from "cookie"
import { csrfHeaderName, jwtCookieName } from "shared"
import { type IncomingHttpHeaders } from "http"

export async function getUser(
  headers: IncomingHttpHeaders
): Promise<string | undefined> {
  if (headers.cookie != null) {
    const cookies = parse(headers.cookie)
    const jwtCookie = cookies[jwtCookieName]
    if (jwtCookie != null && csrfHeaderName in headers) {
      try {
        const jwt = await jwtVerify(jwtCookie, jwsSecret)
        return jwt.payload.sub
      } catch {}
    }
  }
  return undefined
}

// https://stackoverflow.com/a/65666402
export function throwExp(errorMessage: string): never {
  throw new Error(errorMessage)
}

export function optionMap<T, R>(
  t: T | null | undefined,
  f: (_: T) => R
): R | null | undefined {
  if (t == null) {
    return t as null | undefined
  }
  return f(t)
}
