import { redirect } from "solid-start/server"
import { createCookieSessionStorage } from "solid-start/session"
import { Session } from "solid-start/session/sessions"
import { db } from "."
interface LoginForm {
  username: string
  password: string
}

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

const sessionSecret = import.meta.env.SESSION_SECRET

const storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_session",
    // secure doesn't work on localhost for Safari
    // https://web.dev/when-to-use-local-https/
    secure: true,
    secrets: ["hello"],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
})

export async function getUserSession(request: Request): Promise<Session> {
  return await storage.getSession(request.headers.get("Cookie"))
}

export async function getUserId(request: Request): Promise<string | null> {
  const session = await getUserSession(request)
  const userId = session.get("userId") as unknown
  if (typeof userId !== "string" || userId.length === 0) return null
  return userId
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
): Promise<string> {
  const session = await getUserSession(request)
  const userId = session.get("userId") as unknown
  if (typeof userId !== "string" || userId.length === 0) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]])
    throw redirect(`/login?${searchParams}`)
  }
  return userId
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
  session.set("userId", userId)
  return redirect(redirectTo, {
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "Set-Cookie": await storage.commitSession(session),
    },
  })
}
