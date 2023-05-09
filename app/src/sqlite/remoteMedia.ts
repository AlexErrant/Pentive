import {
  type Base64Url,
  type LDbId,
  throwExp,
  type RemoteMediaNum,
} from "shared"
import { getKysely } from "./crsqlite"

export const remoteMediaCollectionMethods = {
  updateUploadDate: async function (
    ids: Array<[Base64Url, unknown, RemoteMediaNum]>
  ) {
    const db = await getKysely()
    for (const [localEntityId, , i] of ids) {
      const r = await db
        .updateTable("remoteMedia")
        .set({ uploadDate: new Date().getTime() })
        .where("localEntityId", "=", localEntityId as LDbId)
        .where("i", "=", i)
        .returningAll()
        .execute()
      if (r.length !== 1)
        throwExp(
          `No remoteMedia found for localEntityId '${localEntityId}' with i ${i}.`
        )
    }
  },
}
