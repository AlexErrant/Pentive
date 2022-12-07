import { z } from "zod"
import { noteRouter } from "./noteRouter.js"
import { templateRouter } from "./templateRouter.js"
import { authedProcedure, publicProcedure, router } from "./trpc.js"
import aio from "@vlcn.io/crsqlite-allinone"
import wholeDbRtc from "./wholeDbServer.js"
import { initSql } from "shared"

export const appRouter = router({
  greeting: publicProcedure
    .input(z.string())
    .query(({ input }) => `hello ${input}!`),
  poke: authedProcedure
    .input(
      z.object({
        pokedBy: z.string().uuid(),
        pokerVersion: z.bigint(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = aio.open(`${ctx.user}.db`)
      try {
        db.execMany(initSql)
        const wdb = await wholeDbRtc(db)
        return await wdb.poked(input.pokedBy, input.pokerVersion)
      } finally {
        db.close()
      }
    }),
  ...templateRouter,
  ...noteRouter,
})

export type AppRouter = typeof appRouter
