import { type NookId, throwExp, type UserId, undefinedMap } from "shared"
import { db } from "./kysely"

export async function getNook(nook: NookId) {
  const r = await db
    .selectFrom("nook")
    .select(["created", "moderators"])
    .where("id", "=", nook)
    .executeTakeFirst()
  return undefinedMap(r, (nook) => ({
    ...nook,
    moderators: deserializeModerators(nook.moderators),
  }))
}

function validateNook(nook: NookId) {
  if (nook.length > 0) {
    // highTODO needs more checks
  } else {
    throwExp("bad nook name")
  }
}

export async function createNook({
  nook,
  userId,
  description,
  sidebar,
}: {
  nook: NookId
  userId: UserId
  description: string
  sidebar: string
}) {
  validateNook(nook)
  await db
    .insertInto("nook")
    .values({
      id: nook,
      moderators: serializeModerators(userId),
    })
    .execute()
}

function deserializeModerators(moderators: string) {
  return JSON.parse(moderators) as string[]
}

function serializeModerators(userId: UserId) {
  return JSON.stringify([userId])
}
