import { undefinedMap } from "shared"
import { MediaId } from "../domain/ids"
import { Media } from "../domain/media"
import * as Comlink from "comlink"
import { getDb, getKysely } from "./crsqlite"
import { Media as MediaEntity } from "./database"

function entityToDomain(entity: MediaEntity): Media {
  return {
    id: entity.id,
    created: new Date(entity.created),
    modified: new Date(entity.modified),
    data: entity.data.buffer,
  }
}

export const mediaCollectionMethods = {
  upsertMedia: async function (media: Media) {
    const db = await getDb()
    const insert = await db.prepare(
      `INSERT INTO media (id,created,modified,data)
                  VALUES ( ?,      ?,       ?,   ?)`
    )
    const created = media.created.getTime()
    const modified = media.modified.getTime()
    await insert.run(media.id, created, modified, new Uint8Array(media.data))
    insert.finalize()
  },
  async bulkAddMedia(media: Media[]) {
    // wa-sqlite write perf is significantly worse than Dexie's.
    // If moving to SQLite official doesn't improve perf, consider using Origin Private File System
    const db = await getDb()
    const insert = await db.prepare(
      `INSERT INTO media (id,created,modified,data)
                  VALUES ( ?,      ?,       ?,   ?)`
    )
    for (const m of media) {
      const created = m.created.getTime()
      const modified = m.modified.getTime()
      await insert.run(m.id, created, modified, new Uint8Array(m.data))
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
