import { Kysely, sql, InsertResult, RawBuilder, InsertObject } from "kysely"
import { PlanetScaleDialect } from "kysely-planetscale"
import { DB } from "./database.js"
import { Base64, Base64Url, DbId, Hex, NoteId, TemplateId } from "./brand.js"
import { binary16fromBase64URL, ulidAsRaw } from "./convertBinary.js"
import { undefinedMap } from "./utility.js"
import { base16, base64url } from "@scure/base"
import { z } from "zod"
import _ from "lodash"
import { compile } from "html-to-text"

const convert = compile({})

// @ts-expect-error db calls should throw null error if not setup
let db: Kysely<DB> = null as Kysely<DB>

export function setKysely(url: string): void {
  if (db == null) {
    db = new Kysely<DB>({
      dialect: new PlanetScaleDialect({
        url,
      }),
    })
  }
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
  localId: z.string() as unknown as z.Schema<NoteId>,
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
  const noteCreatesAndIds = await Promise.all(
    notes.map(async (n) => {
      const remoteId = ulidAsRaw()
      const remoteIdHex = base16.encode(remoteId) as Hex
      const remoteIdBase64url = base64url.encode(remoteId)
      for (const field in n.fieldValues) {
        const oldResponse = new Response(n.fieldValues[field])
        const newResponse = new HTMLRewriter()
          .on("img", {
            // highTODO filter images that shouldn't be replaced, e.g. ones with external URLs.
            // Wait... uh... do we even want to support this? Breaks the point of offline-first...
            element(element) {
              const src = element.getAttribute("src")
              if (src != null) {
                // Filter no-src images - grep 330CE329-B962-4E68-90F3-F4F3700815DA
                element.setAttribute("src", remoteIdBase64url + src)
              }
            },
          })
          .transform(oldResponse)
        n.fieldValues[field] = await newResponse.text()
      }
      const noteCreate: InsertObject<DB, "Note"> = {
        id: unhex(remoteIdHex),
        templateId: fromBase64Url(n.templateId), // highTODO validate
        authorId,
        fieldValues: JSON.stringify(n.fieldValues),
        fts: Object.values(n.fieldValues).map(convert).concat(n.tags).join(" "),
        tags: JSON.stringify(n.tags),
        ankiId: n.ankiId,
      }
      return [
        noteCreate,
        [n.localId, remoteIdBase64url] as [string, string],
      ] as const
    })
  )
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
