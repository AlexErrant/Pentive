import { sql } from "kysely"
import { type UserId, type PeerJsId } from "shared"
import { db } from "./kysely"

export async function setUserPeer(userId: UserId, peerId: PeerJsId) {
  await db
    .updateTable("user")
    .set({
      peer: (x) =>
        sql`JSON_SET(${sql`IFNULL(${x.ref(
          "peer"
        )},'{}')`}, ${`$."${peerId}"`}, "")`,
    })
    .where("id", "=", userId)
    .execute()
}

export async function getUserPeer(userId: UserId) {
  const peer = await db
    .selectFrom("user")
    .select("peer")
    .where("user.id", "=", userId)
    .executeTakeFirst()
  return peer?.peer ?? null
}
