// https://github.com/remix-run/remix/issues/158

import { Cookie, CookieOptions } from "solid-start/session/cookies"
import { parse, serialize } from "cookie"

export const createPlainCookie = (
  name: string,
  cookieOptions: CookieOptions = {}
): Cookie => {
  const { secrets, ...options } = {
    secrets: [],
    path: "/",
    sameSite: "lax" as const,
    ...cookieOptions,
  }

  return {
    get name() {
      return name
    },
    get isSigned() {
      return secrets.length > 0
    },
    get expires() {
      // Max-Age takes precedence over Expires
      return typeof options.maxAge !== "undefined"
        ? new Date(Date.now() + options.maxAge * 1000)
        : options.expires
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async parse(cookieHeader, parseOptions) {
      if (cookieHeader == null) return null
      const cookies = parse(cookieHeader, { ...options, ...parseOptions })
      return cookies[name]
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async serialize(value: string, serializeOptions) {
      return serialize(name, value, {
        ...options,
        ...serializeOptions,
      })
    },
  }
}
