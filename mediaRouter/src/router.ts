import { z } from "zod"
import { publicProcedure, router } from "./trpc"

export const appRouter = router({
  hello: publicProcedure.input(z.string().nullish()).query(({ input }) => {
    return `Hello ${input ?? "World"}!`
  }),
})

export type AppRouter = typeof appRouter
