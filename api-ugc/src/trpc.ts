import { initTRPC } from "@trpc/server"
import superjson from "superjson"

//  eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Context {}

export function createContext(): Context {
  return {}
}

// We export only the functionality that we use so we can enforce which base procedures should be used
// Do not export `t`!
const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure
