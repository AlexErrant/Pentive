import { Kysely, sql, InsertResult, RawBuilder, InsertObject } from "kysely"
import { PlanetScaleDialect } from "kysely-planetscale"
import { DB } from "./database.js"
import {
  Base64,
  Base64Url,
  DbId,
  Hex,
  NoteId,
  RemoteNoteId,
  TemplateId,
  UserId,
} from "./brand.js"
import { binary16fromBase64URL, ulidAsRaw } from "./convertBinary.js"
import { undefinedMap } from "./utility.js"
import { base16, base64url } from "@scure/base"
import { z } from "zod"
import _ from "lodash"
import { compile } from "html-to-text"

const convert = compile({})

// @ts-expect-error db calls should throw null error if not setup
export let db: Kysely<DB> = null as Kysely<DB>

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

export async function userOwnsAndHasMedia(
  ids: NoteId[],
  authorId: UserId,
  id: Base64
): Promise<{
  userOwns: boolean
  hasMedia: boolean
}> {
  const { hasMedia, userOwns } = await db
    .selectFrom([
      db
        .selectFrom("Note")
        .select(db.fn.count("id").as("userOwns"))
        .where("id", "in", ids.map(fromBase64Url))
        .where("authorId", "=", authorId)
        .as("userOwns"),
      db
        .selectFrom("Media_Entity")
        .select(db.fn.count("mediaHash").as("hasMedia"))
        .where("mediaHash", "=", fromBase64(id))
        .as("hasMedia"),
    ])
    .selectAll()
    .executeTakeFirstOrThrow()
  return {
    userOwns: userOwns === ids.length.toString(),
    hasMedia: hasMedia !== "0",
  }
}

export async function lookupMediaHash(
  entityId: Base64,
  i: number
): Promise<Base64 | undefined> {
  const mediaHash = await db
    .selectFrom("Media_Entity")
    .select(sql<Base64>`TO_BASE64(mediaHash)`.as("mediaHash"))
    .where("entityId", "=", fromBase64(entityId))
    .where("i", "=", i)
    .executeTakeFirst()
  return mediaHash?.mediaHash
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

export const editRemoteNote = z.object({
  remoteId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{22}$/) as unknown as z.Schema<RemoteNoteId>,
  templateId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{22}$/) as unknown as z.Schema<TemplateId>,
  fieldValues: z.record(z.string()),
  tags: z.array(z.string()),
  ankiId: z.number().positive().optional(),
})
export type EditRemoteNote = z.infer<typeof editRemoteNote>

export async function insertNotes(
  authorId: UserId,
  notes: CreateRemoteNote[]
): Promise<Record<NoteId, RemoteNoteId>> {
  const noteCreatesAndIds = await Promise.all(
    notes.map(async (n) => {
      const { noteCreate, remoteIdBase64url } = await toNoteCreate(n, authorId)
      return [
        noteCreate,
        [n.localId, remoteIdBase64url] as [NoteId, RemoteNoteId],
      ] as const
    })
  )
  const noteCreates = noteCreatesAndIds.map((x) => x[0])
  await db.insertInto("Note").values(noteCreates).execute()
  const remoteIdByLocal = _.fromPairs(noteCreatesAndIds.map((x) => x[1]))
  return remoteIdByLocal
}

async function toNoteCreate(
  n: EditRemoteNote | CreateRemoteNote,
  authorId: UserId
) {
  const remoteId =
    "remoteId" in n ? base64url.decode(n.remoteId + "==") : ulidAsRaw()
  const remoteIdHex = base16.encode(remoteId) as Hex
  const remoteIdBase64url = base64url.encode(remoteId).substring(0, 22)
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
  return { noteCreate, remoteIdBase64url }
}

export async function editNotes(authorId: UserId, notes: EditRemoteNote[]) {
  const noteCreates = await Promise.all(
    notes.map(async (n) => {
      const { noteCreate } = await toNoteCreate(n, authorId)
      return noteCreate
    })
  )
  // insert into `Note` (`id`, `templateId`, `authorId`, `fieldValues`, `fts`, `tags`)
  // values (UNHEX(?), FROM_BASE64(?), ?, ?, ?, ?)
  // on duplicate key update `templateId` = values(`templateId`), `updatedAt` = values(`updatedAt`), `authorId` = values(`authorId`), `fieldValues` = values(`fieldValues`), `fts` = values(`fts`), `tags` = values(`tags`), `ankiId` = values(`ankiId`)
  await db
    .insertInto("Note")
    .values(noteCreates)
    // https://stackoverflow.com/a/34866431
    .onDuplicateKeyUpdate({
      templateId: (x) => values(x.ref("templateId")),
      // createdAt: (x) => values(x.ref("createdAt")),
      updatedAt: (x) => values(x.ref("updatedAt")),
      authorId: (x) => values(x.ref("authorId")),
      fieldValues: (x) => values(x.ref("fieldValues")),
      fts: (x) => values(x.ref("fts")),
      tags: (x) => values(x.ref("tags")),
      ankiId: (x) => values(x.ref("ankiId")),
    })
    .execute()
}

// nix upon resolution of https://github.com/koskimas/kysely/issues/251
function values<T>(x: RawBuilder<T>) {
  return sql<T>`values(${x})`
}

function unhex(id: Hex): RawBuilder<DbId> {
  return sql<DbId>`UNHEX(${id})`
}

export function fromBase64(id: Base64): RawBuilder<DbId> {
  return sql<DbId>`FROM_BASE64(${id})`
}

export function fromBase64Url(id: Base64Url): RawBuilder<DbId> {
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
