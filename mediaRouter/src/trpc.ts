import { initTRPC, TRPCError } from "@trpc/server"
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch"
import superjson from "superjson"
import { parse } from "hono/utils/cookie"
import { base64ToArray, csrfHeaderName, jwtCookieName } from "shared"
import { jwtVerify } from "jose"

interface Context {
  user: string | undefined
}

export async function createContext(
  jwsSecret: string,
  x: FetchCreateContextFnOptions
): Promise<Context> {
  const user = await getUser(x.req.headers, jwsSecret)
  return { user }
}

async function getUser(
  headers: Headers,
  jwsSecret: string
): Promise<string | undefined> {
  const rawCookie = headers.get("cookie")
  if (rawCookie != null) {
    const cookie = parse(rawCookie)
    const jwtCookie = cookie[jwtCookieName]
    if (headers.get(csrfHeaderName) != null) {
      try {
        const jwt = await jwtVerify(jwtCookie, base64ToArray(jwsSecret))
        return jwt.payload.sub
      } catch {}
    }
  }
  return undefined
}

// We export only the functionality that we use so we can enforce which base procedures should be used
// Do not export `t`!
const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

const isAuthed = t.middleware(async ({ next, ctx }) => {
  if (ctx.user === undefined) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    })
  }
  return await next({
    ctx: {
      user: ctx.user,
    },
  })
})

export const authedProcedure = t.procedure.use(isAuthed)
