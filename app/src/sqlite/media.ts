import { undefinedMap } from "shared"
import { type MediaId, type Media } from "shared"
import * as Comlink from "comlink"
import { getDb, getKysely } from "./crsqlite"
import { type DB, type Media as MediaEntity } from "./database"
import { type Transaction } from "kysely"

function entityToDomain(entity: MediaEntity): Media {
  return {
    id: entity.id,
    created: new Date(entity.created),
    updated: new Date(entity.updated),
    data: entity.data.buffer,
  }
}

export const mediaCollectionMethods = {
  insertMediaTrx: async function (media: Media, db: Transaction<DB>) {
    await db
      .insertInto("media")
      .values({
        id: media.id,
        created: media.created.getTime(),
        updated: media.updated.getTime(),
        data: new Uint8Array(media.data),
      })
      .execute()
  },
  insertMedia: async function (media: Media) {
    const db = await getDb()
    const created = media.created.getTime()
    const updated = media.updated.getTime()
    await db.exec(
      `INSERT INTO media (id,created,updated,data)
                  VALUES ( ?,      ?,      ?,   ?)`,
      [media.id, created, updated, new Uint8Array(media.data)]
    )
  },
  async bulkInsertMedia(media: Media[]) {
    // wa-sqlite write perf is significantly worse than Dexie's.
    // If moving to SQLite official doesn't improve perf, consider using Origin Private File System
    const db = await getDb()
    await db.tx(async (tx) => {
      const insert = await tx.prepare(
        `INSERT INTO media (id,created,updated,data)
                  VALUES ( ?,      ?,      ?,   ?)`
      )
      for (const m of media) {
        const created = m.created.getTime()
        const updated = m.updated.getTime()
        await insert.run(tx, m.id, created, updated, new Uint8Array(m.data))
      }
      await insert.finalize(tx)
    })
  },
  async getMedia(id: MediaId) {
    // This helps detect memory leaks - if you see this log 100x, something's very wrong.
    console.debug("getMedia for " + id)
    const db = await getKysely()
    const media = await db
      .selectFrom("media")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst()
      .then((r) => undefinedMap(r, entityToDomain))
    const data = media?.data ?? undefined
    if (data == null) {
      return data
    } else {
      return Comlink.transfer(media, [data])
    }
  },
}
