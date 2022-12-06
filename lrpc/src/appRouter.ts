import { z } from "zod"
import { noteRouter } from "./noteRouter.js"
import { templateRouter } from "./templateRouter.js"
import { publicProcedure, router } from "./trpc.js"

export const appRouter = router({
  greeting: publicProcedure
    .input(z.string())
    .query(({ input }) => `hello ${input}!`),
  ...templateRouter,
  ...noteRouter,
})

export type AppRouter = typeof appRouter
