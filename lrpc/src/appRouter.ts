import { z } from "zod"
import { noteRouter } from "./noteRouter.js"
import { templateRouter } from "./templateRouter.js"
import { authedProcedure, publicProcedure, router } from "./trpc.js"
import aio from "@vlcn.io/crsqlite-allinone"
import { initSql, wholeDbRtc } from "shared"
import { stringify as uuidStringify } from "uuid"

const tableName = z.string()
const quoteConcatedPKs = z.string().or(z.number())
const cid = z.string()
const val = z.any()
const version = z.string().or(z.number())
const siteIdWire = z.string()

const changeSet = z.tuple([
  tableName,
  quoteConcatedPKs,
  cid,
  val,
  version,
  siteIdWire,
])

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
        const siteId = uuidStringify(
          db.execA<[Uint8Array]>("SELECT crsql_siteid();")[0][0]
        )
        const wdb = await wholeDbRtc(db)
        const version = await wdb.onPoked(input.pokedBy, input.pokerVersion)
        const changes = await wdb.onChangesRequested(
          input.pokedBy,
          input.pokerVersion
        )
        return {
          version,
          siteId,
          changes,
        }
      } finally {
        db.close()
      }
    }),
  receiveChanges: authedProcedure
    .input(
      z.object({
        changeSets: z.array(changeSet),
        fromSiteId: siteIdWire,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = aio.open(`${ctx.user}.db`)
      try {
        const wdb = await wholeDbRtc(db)
        await wdb.onChangesReceived(input.fromSiteId, input.changeSets)
      } finally {
        db.close()
      }
    }),
  ...templateRouter,
  ...noteRouter,
})

export type AppRouter = typeof appRouter
