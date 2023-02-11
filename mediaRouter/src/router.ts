import { z } from "zod"
import { authedProcedure, publicProcedure, router } from "./trpc"

export const appRouter = router({
  hello: publicProcedure.input(z.string().nullish()).query(({ input }) => {
    return `Hello ${input ?? "World"}!`
  }),
  authedHello: authedProcedure.query(({ ctx }) => {
    return `Authed Hello ${ctx.user}!`
  }),
})

export type AppRouter = typeof appRouter
