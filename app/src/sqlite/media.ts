import { undefinedMap } from "shared"
import { MediaId } from "../domain/ids"
import { Media } from "../domain/media"
import * as Comlink from "comlink"
import { getDb, getKysely } from "./crsqlite"
import { DB, Media as MediaEntity } from "./database"
import { Transaction } from "kysely"

function entityToDomain(entity: MediaEntity): Media {
  return {
    id: entity.id,
    created: new Date(entity.created),
    updated: new Date(entity.updated),
    data: entity.data.buffer,
  }
}

export const mediaCollectionMethods = {
  upsertMediaTrx: async function (media: Media, db: Transaction<DB>) {
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
  upsertMedia: async function (media: Media) {
    const db = await getDb()
    const insert = await db.prepare(
      `INSERT INTO media (id,created,updated,data)
                  VALUES ( ?,      ?,      ?,   ?)`
    )
    const created = media.created.getTime()
    const updated = media.updated.getTime()
    await insert.run(media.id, created, updated, new Uint8Array(media.data))
    insert.finalize()
  },
  async bulkAddMedia(media: Media[]) {
    // wa-sqlite write perf is significantly worse than Dexie's.
    // If moving to SQLite official doesn't improve perf, consider using Origin Private File System
    const db = await getDb()
    const insert = await db.prepare(
      `INSERT INTO media (id,created,updated,data)
                  VALUES ( ?,      ?,      ?,   ?)`
    )
    for (const m of media) {
      const created = m.created.getTime()
      const updated = m.updated.getTime()
      await insert.run(m.id, created, updated, new Uint8Array(m.data))
    }
    insert.finalize()
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
