import { base64url } from "shared"
import { redirect } from "solid-start/server"
import { createCookieSessionStorage } from "solid-start/session"
import { Session, SessionStorage } from "solid-start/session/sessions"
import { db } from "."
interface LoginForm {
  username: string
  password: string
}

const sessionUserId = "userId"
const sessionCsrf = "csrf"
const sessionNames = [sessionUserId, sessionCsrf] as const
type SessionName = typeof sessionNames[number]
export type UserSession = { [K in SessionName]: string }

export async function register({
  username,
  password,
}: LoginForm): Promise<{ id: number; username: string; password: string }> {
  return await db.user.create({
    data: { username, password },
  })
}

export async function login({ username, password }: LoginForm): Promise<{
  id: number
  username: string
  password: string
} | null> {
  const user = await db.user.findUnique({ where: { username } })
  if (user == null) return null
  const isCorrectPassword = password === user.password
  if (!isCorrectPassword) return null
  return user
}

export function setSessionStorage(sessionSecret: string): void {
  storage = createCookieSessionStorage({
    cookie: {
      name: "__Host-session",
      secure: true,
      secrets: [sessionSecret],
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      // domain: "", // intentionally missing https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#cookie-with-__host-prefix
      // expires: "", // intentionally missing because docs say it's calculated off `maxAge` when missing https://github.com/solidjs/solid-start/blob/1b22cad87dd7bd74f73d807e1d60b886e753a6ee/packages/start/session/cookies.ts#L56-L57
    },
  })
}

// @ts-expect-error session calls should throw null error if not setup
let storage = null as SessionStorage

export async function getUserSession(request: Request): Promise<Session> {
  return await storage.getSession(request.headers.get("Cookie"))
}

export async function getUserId(request: Request): Promise<string | null> {
  const session = await getUserSession(request)
  const userId = session.get(sessionUserId) as unknown
  if (typeof userId !== "string" || userId.length === 0) return null
  return userId
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

export async function getUser(
  request: Request
): Promise<
  { id: number; username: string; password: string } | null | undefined
> {
  const userId = await getUserId(request)
  if (typeof userId !== "string") {
    return null
  }

  try {
    const user = await db.user.findUnique({ where: { id: Number(userId) } })
    return user
  } catch {
    throw await logout(request)
  }
}

export async function logout(request: Request): Promise<Response> {
  const session = await storage.getSession(request.headers.get("Cookie"))
  return redirect("/login", {
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "Set-Cookie": await storage.destroySession(session),
    },
  })
}

export async function createUserSession(
  userId: string,
  redirectTo: string
): Promise<Response> {
  const session = await storage.getSession()
  session.set(sessionUserId, userId)
  session.set(
    sessionCsrf,
    // https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie
    // If you ever separate csrf from the session cookie https://security.stackexchange.com/a/220810 https://security.stackexchange.com/a/248434
    // REST endpoints may need csrf https://security.stackexchange.com/q/166724
    base64url.encode(crypto.getRandomValues(new Uint8Array(32)))
  )
  return redirect(redirectTo, {
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "Set-Cookie": await storage.commitSession(session),
    },
  })
}
