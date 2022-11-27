import { z } from "zod"
import { templateRouter } from "./templateRouter"
import { publicProcedure, router } from "./trpc"

export const appRouter = router({
  greeting: publicProcedure
    .input(z.string())
    .query(({ input }) => `hello ${input}!`),
  ...templateRouter,
})

export type AppRouter = typeof appRouter
