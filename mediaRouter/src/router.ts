import {
  createRemoteNote,
  editNotes,
  editRemoteNote,
  insertNotes,
} from "shared"
import { z } from "zod"
import { authedProcedure, publicProcedure, router } from "./trpc"

export const appRouter = router({
  hello: publicProcedure.input(z.string().nullish()).query(({ input }) => {
    return `Hello ${input ?? "World"}!`
  }),
  authedHello: authedProcedure.query(({ ctx }) => {
    return `Authed Hello ${ctx.user}!`
  }),
  createNote: authedProcedure
    .input(z.array(createRemoteNote).min(1))
    .mutation(async ({ input, ctx }) => {
      const remoteIdByLocal = await insertNotes(ctx.user, input)
      return remoteIdByLocal
    }),
  editNote: authedProcedure
    .input(z.array(editRemoteNote).min(1))
    .mutation(async ({ input, ctx }) => await editNotes(ctx.user, input)),
})

export type AppRouter = typeof appRouter
