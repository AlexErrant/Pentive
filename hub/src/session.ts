import { jwtVerify, type JWTVerifyResult, SignJWT } from "jose"
import {
  type Base64,
  base64url,
  csrfSignatureCookieName,
  jwtCookieName,
  throwExp,
  type UserId,
} from "shared"
import { base64ToArray } from "shared-edge"
import { redirect } from "solid-start/server"
import { createCookieSessionStorage } from "solid-start/session"
import { type Cookie, type CookieOptions } from "solid-start/session/cookies"
import { type Session, type SessionStorage } from "solid-start/session/sessions"
import { createPlainCookie } from "~/createPlainCookie"

const sessionUserId = "userId"
const sessionNames = [sessionUserId] as const
type SessionName = (typeof sessionNames)[number]
export type UserSession = { [K in SessionName]: string }

export function setSessionStorage(x: {
  sessionSecret: Base64
  jwsSecret: Base64
  csrfSecret: Base64
  hubInfoSecret: Base64
  oauthStateSecret: Base64
  oauthCodeVerifierSecret: Base64
}): void {
  // highTODO consider removing this when adding Auth.js. We need cross-domain auth, and I'm not sure why this exists if we're using a JWT
  storage = createCookieSessionStorage({
    cookie: {
      name: "__Host-session",
      secure: true,
      secrets: [x.sessionSecret],
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      // domain: "", // intentionally missing https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#cookie-with-__host-prefix
      // expires: "", // intentionally missing because docs say it's calculated off `maxAge` when missing https://github.com/solidjs/solid-start/blob/1b22cad87dd7bd74f73d807e1d60b886e753a6ee/packages/start/session/cookies.ts#L56-L57
    },
  })
  jwsSecret = base64ToArray(x.jwsSecret)
  csrfSecret = x.csrfSecret
  hubInfoSecret = base64ToArray(x.hubInfoSecret)
  const jwtCookieOpts: CookieOptions = {
    secure: true,
    secrets: [], // intentionally empty. This cookie should only store a signed JWT!
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    domain: import.meta.env.VITE_HUB_DOMAIN, // sadly, making cookies target specific subdomains from the main domain seems very hacky
    // expires: "", // intentionally missing because docs say it's calculated off `maxAge` when missing https://github.com/solidjs/solid-start/blob/1b22cad87dd7bd74f73d807e1d60b886e753a6ee/packages/start/session/cookies.ts#L56-L57
  }
  jwtCookie = createPlainCookie(jwtCookieName, jwtCookieOpts)
  destroyJwtCookie = createPlainCookie(jwtCookieName, {
    ...jwtCookieOpts,
    maxAge: undefined,
    expires: new Date(0), // https://github.com/remix-run/remix/issues/5150 https://stackoverflow.com/q/5285940
  })
  // lowTODO store this on the client in a cross-domain compatible way - it need not be a cookie https://stackoverflow.com/q/34790887
  const csrfSignatureCookieOpts: CookieOptions = {
    secure: true,
    secrets: [], // intentionally empty. This cookie only stores an HMACed CSRF token.
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: false,
    domain: import.meta.env.VITE_HUB_DOMAIN, // sadly, making cookies target specific subdomains from the main domain seems very hacky
    // expires: "", // intentionally missing because docs say it's calculated off `maxAge` when missing https://github.com/solidjs/solid-start/blob/1b22cad87dd7bd74f73d807e1d60b886e753a6ee/packages/start/session/cookies.ts#L56-L57
  }
  csrfSignatureCookie = createPlainCookie(
    csrfSignatureCookieName,
    csrfSignatureCookieOpts
  )
  destroyCsrfSignatureCookie = createPlainCookie(csrfSignatureCookieName, {
    ...csrfSignatureCookieOpts,
    maxAge: undefined,
    expires: new Date(0), // https://github.com/remix-run/remix/issues/5150 https://stackoverflow.com/q/5285940
  })

  const oauthStateCookieOpts: CookieOptions = {
    secure: true,
    secrets: [x.oauthStateSecret], // encrypted due to https://security.stackexchange.com/a/140889
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
    httpOnly: true,
    // domain: "", // intentionally missing to exclude subdomains
    // expires: "", // intentionally missing because docs say it's calculated off `maxAge` when missing https://github.com/solidjs/solid-start/blob/1b22cad87dd7bd74f73d807e1d60b886e753a6ee/packages/start/session/cookies.ts#L56-L57
  }
  const oauthStateCookieName = "__Host-oauthState"
  oauthStateCookie = createPlainCookie(
    oauthStateCookieName,
    oauthStateCookieOpts
  )
  destroyOauthStateCookie = createPlainCookie(oauthStateCookieName, {
    ...oauthStateCookieOpts,
    maxAge: undefined,
    expires: new Date(0), // https://github.com/remix-run/remix/issues/5150 https://stackoverflow.com/q/5285940
  })

  const oauthCodeVerifierCookieOpts: CookieOptions = {
    secure: true,
    secrets: [x.oauthCodeVerifierSecret], // encrypted due to https://stackoverflow.com/a/67520418 https://stackoverflow.com/a/67979777
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
    httpOnly: true,
    // domain: "", // intentionally missing to exclude subdomains
    // expires: "", // intentionally missing because docs say it's calculated off `maxAge` when missing https://github.com/solidjs/solid-start/blob/1b22cad87dd7bd74f73d807e1d60b886e753a6ee/packages/start/session/cookies.ts#L56-L57
  }
  const oauthCodeVerifierCookieName = "__Host-oauthCodeVerifier"
  oauthCodeVerifierCookie = createPlainCookie(
    oauthCodeVerifierCookieName,
    oauthCodeVerifierCookieOpts
  )
  destroyOauthCodeVerifierCookie = createPlainCookie(
    oauthCodeVerifierCookieName,
    {
      ...oauthCodeVerifierCookieOpts,
      maxAge: undefined,
      expires: new Date(0), // https://github.com/remix-run/remix/issues/5150 https://stackoverflow.com/q/5285940
    }
  )

  const hubInfoCookieOpts: CookieOptions = {
    secure: true,
    secrets: [], // intentionally empty. This cookie only stores an HMACed JWT.
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 2, // 2 hours
    httpOnly: true,
    // domain: "", // intentionally missing to exclude subdomains
    // expires: "", // intentionally missing because docs say it's calculated off `maxAge` when missing https://github.com/solidjs/solid-start/blob/1b22cad87dd7bd74f73d807e1d60b886e753a6ee/packages/start/session/cookies.ts#L56-L57
  }
  const hubInfoCookieName = "__Host-hubInfo"
  hubInfoCookie = createPlainCookie(hubInfoCookieName, hubInfoCookieOpts)
}

// @ts-expect-error session calls should throw null error if not setup
let storage = null as SessionStorage
// @ts-expect-error calls should throw null error if not setup
let jwtCookie = null as Cookie
// @ts-expect-error calls should throw null error if not setup
let destroyJwtCookie = null as Cookie
// @ts-expect-error calls should throw null error if not setup
let csrfSignatureCookie = null as Cookie
// @ts-expect-error calls should throw null error if not setup
let destroyCsrfSignatureCookie = null as Cookie
// @ts-expect-error calls should throw null error if not setup
let oauthStateCookie = null as Cookie
// @ts-expect-error calls should throw null error if not setup
let destroyOauthStateCookie = null as Cookie
// @ts-expect-error calls should throw null error if not setup
let oauthCodeVerifierCookie = null as Cookie
// @ts-expect-error calls should throw null error if not setup
let destroyOauthCodeVerifierCookie = null as Cookie
// @ts-expect-error calls should throw null error if not setup
let hubInfoCookie = null as Cookie
// @ts-expect-error calls should throw null error if not setup
let jwsSecret = null as Uint8Array
// @ts-expect-error calls should throw null error if not setup
let csrfSecret = null as string
// @ts-expect-error calls should throw null error if not setup
let hubInfoSecret = null as Uint8Array

export async function getUserSession(request: Request): Promise<Session> {
  return await storage.getSession(request.headers.get("Cookie"))
}

export async function getCsrfSignature(
  request: Request
): Promise<string | null> {
  const csrfSignature = (await csrfSignatureCookie.parse(
    request.headers.get("Cookie")
  )) as unknown
  if (typeof csrfSignature !== "string" || csrfSignature.length === 0) {
    return null
  }
  return csrfSignature
}

export async function getOauthState(request: Request) {
  const state = (await oauthStateCookie.parse(
    request.headers.get("Cookie")
  )) as unknown
  if (typeof state !== "string" || state.length === 0) {
    throw new Error("oauth state is empty or not a string")
  }
  return state
}

export async function getOauthCodeVerifier(request: Request) {
  const codeVerifier = (await oauthCodeVerifierCookie.parse(
    request.headers.get("Cookie")
  )) as unknown
  if (typeof codeVerifier !== "string" || codeVerifier.length === 0) {
    throw new Error("oauth codeVerifier is empty or not a string")
  }
  return codeVerifier
}

export interface Jwt {
  sub: string
  jti: string
}

export async function getJwt(request: Request): Promise<Jwt | null> {
  const rawJwt = (await jwtCookie.parse(
    request.headers.get("Cookie")
  )) as string
  let jwt: JWTVerifyResult | null = null
  try {
    jwt = await jwtVerify(rawJwt, jwsSecret)
  } catch {}
  return jwt == null
    ? null
    : {
        sub: jwt.payload.sub ?? throwExp("`sub` is empty"),
        jti: jwt.payload.jti ?? throwExp("`jti` is empty"),
      }
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request)
  const userId = session.get(sessionUserId) as unknown
  if (typeof userId !== "string" || userId.length === 0) return null
  return userId as UserId
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const r = await getUserId(request)
  if (r == null) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]])
    throw redirect(`/login?${searchParams.toString()}`) as unknown
  }
  return r
}

export async function requireSession(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
): Promise<UserSession> {
  const session = await getUserSession(request)
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const r = {} as UserSession
  for (const sessionName of sessionNames) {
    const sessionValue = session.get(sessionName) as unknown
    if (typeof sessionValue !== "string" || sessionValue.length === 0) {
      const searchParams = new URLSearchParams([["redirectTo", redirectTo]])
      throw redirect(`/login?${searchParams.toString()}`) as unknown
    }
    r[sessionName] = sessionValue
  }
  return r
}

export async function requireCsrfSignature(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
): Promise<string> {
  const csrfSignature = await getCsrfSignature(request)
  if (csrfSignature == null) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]])
    throw redirect(`/login?${searchParams.toString()}`) as unknown
  }
  return csrfSignature
}

export async function requireJwt(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
): Promise<Jwt> {
  const jwt = await getJwt(request)
  if (jwt == null) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]])
    throw redirect(`/login?${searchParams.toString()}`) as unknown
  }
  return jwt
}

export async function logout(request: Request): Promise<Response> {
  const session = await storage.getSession(request.headers.get("Cookie"))
  const headers = new Headers()
  headers.append("Set-Cookie", await storage.destroySession(session)) // lowTODO parallelize
  headers.append("Set-Cookie", await destroyJwtCookie.serialize("")) // lowTODO parallelize
  headers.append("Set-Cookie", await destroyCsrfSignatureCookie.serialize("")) // lowTODO parallelize
  return redirect("/login", {
    headers,
  })
}

export async function createUserSession(
  userId: string,
  redirectTo: string
): Promise<Response> {
  const session = await storage.getSession()
  session.set(sessionUserId, userId)
  const [csrf, csrfSignature] = await generateCsrf()
  const headers = new Headers()
  headers.append("Set-Cookie", await storage.commitSession(session)) // lowTODO parallelize
  const jwt = await generateJwt(userId, csrf)
  headers.append("Set-Cookie", await jwtCookie.serialize(jwt)) // lowTODO parallelize
  // https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie
  // If you ever separate csrf from the session cookie https://security.stackexchange.com/a/220810 https://security.stackexchange.com/a/248434
  // REST endpoints may need csrf https://security.stackexchange.com/q/166724
  headers.append(
    "Set-Cookie",
    await csrfSignatureCookie.serialize(csrfSignature)
  ) // lowTODO parallelize
  headers.append("Set-Cookie", await destroyOauthStateCookie.serialize("")) // lowTODO parallelize
  headers.append(
    "Set-Cookie",
    await destroyOauthCodeVerifierCookie.serialize("")
  ) // lowTODO parallelize
  return redirect(redirectTo, {
    headers,
  })
}

export async function createLoginHeaders(state: string, codeVerifier: string) {
  const headers = new Headers()
  headers.append("Set-Cookie", await oauthStateCookie.serialize(state))
  headers.append(
    "Set-Cookie",
    await oauthCodeVerifierCookie.serialize(codeVerifier)
  )
  return headers
}

export async function createInfoHeaders(info: string) {
  // could use crypto.subtle instead of a JWT for less overhead, but I'm tired of subtle and thinking in binary
  const infoJwt = await new SignJWT({ info })
    .setProtectedHeader({ alg })
    .setExpirationTime("2h")
    .sign(await getHubInfoKey())
  const headers = new Headers()
  headers.append("Set-Cookie", await hubInfoCookie.serialize(infoJwt))
  return headers
}

export async function getInfo(request: Request) {
  const rawInfoJwt = (await hubInfoCookie.parse(
    request.headers.get("Cookie")
  )) as unknown
  if (typeof rawInfoJwt !== "string" || rawInfoJwt.length === 0) {
    return null
  }
  let jwt: JWTVerifyResult | null = null
  try {
    jwt = await jwtVerify(rawInfoJwt, hubInfoSecret)
  } catch {}
  return jwt == null
    ? null
    : (jwt.payload.info as string) ?? throwExp("`info` is empty")
}

async function generateJwt(userId: string, csrf: string): Promise<string> {
  return await new SignJWT({})
    .setProtectedHeader({ alg })
    .setSubject(userId)
    .setJti(csrf) // use 256-bit csrf as JTI https://www.rfc-editor.org/rfc/rfc7519#section-4.1.7 https://security.stackexchange.com/a/220810 https://security.stackexchange.com/a/248434
    // .setNotBefore() // highTODO
    // .setIssuedAt()
    // .setIssuer("urn:example:issuer")
    // .setAudience("urn:example:audience")
    // .setExpirationTime("2h")
    .sign(jwsSecret)
}

let maybeCsrfKey: CryptoKey | null = null
async function getCsrfKey(): Promise<CryptoKey> {
  if (maybeCsrfKey == null) {
    maybeCsrfKey = await crypto.subtle.importKey(
      "raw",
      base64ToArray(csrfSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    )
  }
  return maybeCsrfKey
}

let maybeHubInfoKey: CryptoKey | null = null
async function getHubInfoKey(): Promise<CryptoKey> {
  if (maybeHubInfoKey == null) {
    maybeHubInfoKey = await crypto.subtle.importKey(
      "raw",
      hubInfoSecret,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    )
  }
  return maybeHubInfoKey
}

async function generateCsrf(): Promise<[string, string]> {
  const csrfBytes = crypto.getRandomValues(new Uint8Array(32))
  const csrfKey = await getCsrfKey()
  const csrfSignature = await crypto.subtle.sign("HMAC", csrfKey, csrfBytes)
  return [
    base64url.encode(csrfBytes).substring(0, 43),
    base64url.encode(new Uint8Array(csrfSignature)).substring(0, 43),
  ]
}

export async function isInvalidCsrf(
  csrfSignature: string,
  csrf: string
): Promise<boolean> {
  const csrfKey = await getCsrfKey()
  const signature = base64url.decode(csrfSignature + "=")
  const data = base64url.decode(csrf + "=")
  const isValid = await crypto.subtle.verify("HMAC", csrfKey, signature, data)
  return !isValid
}

const alg = "HS256"
