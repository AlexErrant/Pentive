import { Kysely, sql, InsertResult, RawBuilder, InsertObject } from "kysely"
import { PlanetScaleDialect } from "kysely-planetscale"
import { DB } from "./database.js"
import { Base64, Base64Url, DbId, Hex, TemplateId } from "./brand.js"
import { binary16fromBase64URL, ulidAsHex } from "./convertBinary.js"
import { undefinedMap } from "./utility.js"
import { base16, base64url } from "@scure/base"
import { z } from "zod"
import _ from "lodash"
import { compile } from "html-to-text"

const convert = compile({})

// @ts-expect-error db calls should throw null error if not setup
let db: Kysely<DB> = null as Kysely<DB>

export function setKysely(url: string): void {
  db = new Kysely<DB>({
    dialect: new PlanetScaleDialect({
      url,
    }),
  })
}

export async function getPosts({ nook }: { nook: string }): Promise<
  Array<{
    id: Base64Url
    title: string
    text: string
    authorId: string
  }>
> {
  return await db
    .selectFrom("Post")
    .select(["id", "title", "text", "authorId"])
    .where("nook", "=", nook)
    .execute()
    .then((ps) => ps.map(mapIdToBase64Url))
}

export async function getPost(id: Base64Url): Promise<
  | {
      id: Base64Url
      title: string
      text: string
      authorId: string
    }
  | undefined
> {
  return await db
    .selectFrom("Post")
    .select(["id", "title", "text", "authorId"])
    .where("id", "=", fromBase64Url(id))
    .executeTakeFirst()
    .then((x) => undefinedMap(x, mapIdToBase64Url))
}

export async function insertPost({
  authorId,
  nook,
  text,
  title,
  id,
}: {
  authorId: string
  nook: string
  text: string
  title: string
  id: Hex
}): Promise<InsertResult[]> {
  return await db
    .insertInto("Post")
    .values({
      id: unhex(id),
      authorId,
      nook,
      text,
      title,
    })
    .execute()
}

export const createRemoteNote = z.object({
  localId: z.string(),
  templateId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{22}$/) as unknown as z.Schema<TemplateId>,
  fieldValues: z.record(z.string()),
  tags: z.array(z.string()),
  ankiId: z.number().positive().optional(),
})
export type CreateRemoteNote = z.infer<typeof createRemoteNote>

export async function insertNotes(
  authorId: string,
  notes: CreateRemoteNote[]
): Promise<Record<string, string>> {
  const noteCreatesAndIds = notes.map((n) => {
    const remoteId = ulidAsHex()
    const noteCreate: InsertObject<DB, "Note"> = {
      id: unhex(remoteId),
      templateId: fromBase64Url(n.templateId), // highTODO validate
      authorId,
      fieldValues: JSON.stringify(n.fieldValues),
      fts: Object.values(n.fieldValues).map(convert).concat(n.tags).join(" "),
      tags: JSON.stringify(n.tags),
      ankiId: n.ankiId,
    }
    return [
      noteCreate,
      [n.localId, base64url.encode(base16.decode(remoteId))] as [
        string,
        string
      ],
    ] as const
  })
  const noteCreates = noteCreatesAndIds.map((x) => x[0])
  await db.insertInto("Note").values(noteCreates).execute()
  const remoteIdByLocal = _.fromPairs(noteCreatesAndIds.map((x) => x[1]))
  return remoteIdByLocal
}

function unhex(id: Hex): RawBuilder<DbId> {
  return sql<DbId>`UNHEX(${id})`
}

function fromBase64(id: Base64): RawBuilder<DbId> {
  return sql<DbId>`FROM_BASE64(${id})`
}

function fromBase64Url(id: Base64Url): RawBuilder<DbId> {
  return fromBase64(binary16fromBase64URL(id))
}

function mapIdToBase64Url<T>(t: T & { id: DbId }): T & {
  id: Base64Url
} {
  const array = Uint8Array.from(t.id.split("").map((b) => b.charCodeAt(0))) // https://github.com/planetscale/database-js/issues/78#issuecomment-1376435565
  return {
    ...t,
    id: base64url.encode(array).substring(0, 22) as Base64Url,
  }
}
