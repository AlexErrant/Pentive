import { undefinedMap } from "shared"
import { MediaId } from "../domain/ids"
import { Resource } from "../domain/resource"
import * as Comlink from "comlink"
import { getDb, getKysely } from "./crsqlite"
import { Resource as ResourceEntity } from "./database"

function entityToDomain(entity: ResourceEntity): Resource {
  return {
    id: entity.id,
    created: new Date(entity.created),
    data: entity.data.buffer,
  }
}

export const resourceCollectionMethods = {
  upsertResource: async function (resource: Resource) {
    const db = await getDb()
    const insert = await db.prepare(
      `INSERT INTO resource (id,created,data)
                     VALUES ( ?,      ?,   ?)`
    )
    await insert.run(
      resource.id,
      resource.created.getTime(),
      new Uint8Array(resource.data)
    )
    insert.finalize()
  },
  async bulkAddResources(resources: Resource[]) {
    // wa-sqlite write perf is significantly worse than Dexie's.
    // If moving to SQLite official doesn't improve perf, consider using Origin Private File System
    const db = await getDb()
    const insert = await db.prepare(
      `INSERT INTO resource (id,created,data)
                     VALUES ( ?,      ?,   ?)`
    )
    for (const resource of resources) {
      await insert.run(
        resource.id,
        resource.created.getTime(),
        new Uint8Array(resource.data)
      )
    }
    insert.finalize()
  },
  async getResource(id: MediaId) {
    // This helps detect memory leaks - if you see this log 100x, something's very wrong.
    console.debug("getResource for " + id)
    const db = await getKysely()
    const resource = await db
      .selectFrom("resource")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst()
      .then((r) => undefinedMap(r, entityToDomain))
    const data = resource?.data ?? undefined
    if (data == null) {
      return data
    } else {
      return Comlink.transfer(resource, [data])
    }
  },
}
