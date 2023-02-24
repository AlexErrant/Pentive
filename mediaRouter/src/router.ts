import { z } from "zod"
import { authedProcedure, publicProcedure, router } from "./trpc"
import { noteRouter } from "./noteRouter"
import { templateRouter } from "./templateRouter"

export const appRouter = router({
  hello: publicProcedure.input(z.string().nullish()).query(({ input }) => {
    return `Hello ${input ?? "World"}!`
  }),
  authedHello: authedProcedure.query(({ ctx }) => {
    return `Authed Hello ${ctx.user}!`
  }),
  ...noteRouter,
  ...templateRouter,
})

export type AppRouter = typeof appRouter
