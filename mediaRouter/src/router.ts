import { z } from "zod"
import { authedProcedure, publicProcedure, router } from "./trpc"
import { noteRouter } from "./noteRouter"

export const appRouter = router({
  hello: publicProcedure.input(z.string().nullish()).query(({ input }) => {
    return `Hello ${input ?? "World"}!`
  }),
  authedHello: authedProcedure.query(({ ctx }) => {
    return `Authed Hello ${ctx.user}!`
  }),
  ...noteRouter,
})

export type AppRouter = typeof appRouter
