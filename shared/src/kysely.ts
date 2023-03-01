import { Kysely, sql, InsertResult, RawBuilder, InsertObject } from "kysely"
import { PlanetScaleDialect } from "kysely-planetscale"
import { DB } from "./database.js"
import {
  Base64,
  Base64Url,
  DbId,
  Hex,
  NookId,
  NoteId,
  RemoteNoteId,
  RemoteTemplateId,
  TemplateId,
  UserId,
} from "./brand.js"
import { binary16fromBase64URL, ulidAsRaw } from "./convertBinary.js"
import { stringifyMap, throwExp, undefinedMap } from "./utility.js"
import { base16, base64url } from "@scure/base"
import { compile } from "html-to-text"
import {
  CreateRemoteNote,
  CreateRemoteTemplate,
  EditRemoteNote,
  EditRemoteTemplate,
} from "./schema.js"

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

export async function userOwnsNoteAndHasMedia(
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

export async function userOwnsTemplateAndHasMedia(
  ids: TemplateId[],
  authorId: UserId,
  id: Base64
): Promise<{
  userOwns: boolean
  hasMedia: boolean
}> {
  const { hasMedia, userOwns } = await db
    .selectFrom([
      db
        .selectFrom("Template")
        .select(db.fn.count("id").as("userOwns"))
        .where("id", "in", ids.map(fromBase64Url))
        // .where("authorId", "=", authorId) // highTODO
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

export async function insertNotes(authorId: UserId, notes: CreateRemoteNote[]) {
  const rtIds = notes.flatMap((n) => n.remoteTemplateIds).map(fromBase64Url)
  // highTODO validate author
  const templates = await db
    .selectFrom("Template")
    .select(["nook", "id"])
    .where("id", "in", rtIds)
    .execute()
  if (templates.length !== rtIds.length)
    throwExp("You have an invalid RemoteTemplateId.")
  const noteCreatesAndIds = (
    await Promise.all(
      notes.map(async (n) => {
        const ncs = await toNoteCreates(n, authorId)
        return ncs.map(
          ({ noteCreate, remoteIdBase64url, remoteTemplateId }) => {
            const t =
              templates.find(
                (t) => dbIdToBase64Url(t.id) === remoteTemplateId
              ) ?? throwExp(`Template not found - should be impossible.`)
            return [
              noteCreate,
              [[n.localId, t.nook], remoteIdBase64url],
            ] as const
          }
        )
      })
    )
  ).flatMap((x) => x)
  const noteCreates = noteCreatesAndIds.map((x) => x[0])
  await db.insertInto("Note").values(noteCreates).execute()
  const remoteIdByLocal = new Map(noteCreatesAndIds.map((x) => x[1]))
  return remoteIdByLocal
}

export async function insertTemplates(
  authorId: UserId,
  templates: CreateRemoteTemplate[]
) {
  const templateCreatesAndIds = (
    await Promise.all(
      templates.map(async (n) => {
        const tcs = await toTemplateCreates(n, authorId)
        return tcs.map(({ templateCreate, remoteIdBase64url }) => {
          return [
            templateCreate,
            [[n.localId, templateCreate.nook], remoteIdBase64url],
          ] as const
        })
      })
    )
  ).flatMap((x) => x)
  const templateCreates = templateCreatesAndIds.map((x) => x[0])
  await db.insertInto("Template").values(templateCreates).execute()
  const remoteIdByLocal = new Map(templateCreatesAndIds.map((x) => x[1]))
  return remoteIdByLocal
}

async function toNoteCreates(
  n: EditRemoteNote | CreateRemoteNote,
  authorId: UserId
) {
  const remoteIds =
    "remoteIds" in n
      ? new Map(
          Array.from(n.remoteIds).map(([remoteNoteId, remoteTemplateId]) => [
            base64url.decode(remoteNoteId + "=="),
            remoteTemplateId ??
              throwExp(
                "remove upon resolution of https://github.com/colinhacks/zod/pull/2097"
              ),
          ])
        )
      : new Map(n.remoteTemplateIds.map((rt) => [ulidAsRaw(), rt]))
  return await Promise.all(
    Array.from(remoteIds).map(async (x) => await toNoteCreate(x, n, authorId))
  )
}

async function toNoteCreate(
  [remoteNoteId, remoteTemplateId]: [Uint8Array, RemoteTemplateId],
  n: EditRemoteNote | CreateRemoteNote,
  authorId: UserId
) {
  const updatedAt = "remoteId" in n ? new Date() : undefined
  const remoteIdHex = base16.encode(remoteNoteId) as Hex
  const remoteIdBase64url = base64url
    .encode(remoteNoteId)
    .substring(0, 22) as RemoteNoteId
  for (const [field, value] of n.fieldValues) {
    n.fieldValues.set(field, await replaceImgSrcs(value, remoteIdBase64url))
  }
  const noteCreate: InsertObject<DB, "Note"> = {
    id: unhex(remoteIdHex),
    templateId: fromBase64Url(remoteTemplateId), // highTODO validate
    authorId,
    updatedAt,
    fieldValues: stringifyMap(n.fieldValues),
    fts: Array.from(n.fieldValues)
      .map(([, v]) => convert(v))
      .concat(n.tags)
      .join(" "),
    tags: JSON.stringify(n.tags),
    ankiId: n.ankiId,
  }
  return { noteCreate, remoteIdBase64url, remoteTemplateId }
}

async function replaceImgSrcs(value: string, remoteIdBase64url: string) {
  const oldResponse = new Response(value)
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
  const r = await newResponse.text()
  return r
}

async function toTemplateCreates(
  n: EditRemoteTemplate | CreateRemoteTemplate,
  authorId: UserId // highTODO update History. Could History be a compressed column instead of its own table?
) {
  const remoteIds =
    "remoteIds" in n
      ? n.remoteIds.map(
          (id) =>
            [base64url.decode(id + "=="), "undefined_nook" as NookId] as const
        )
      : n.nooks.map((nook) => [ulidAsRaw(), nook] as const)
  return await Promise.all(
    remoteIds.map(async ([id, nook]) => await toTemplateCreate(n, id, nook))
  )
}

async function toTemplateCreate(
  n: EditRemoteTemplate | CreateRemoteTemplate,
  remoteId: Uint8Array,
  nook: NookId
) {
  const updatedAt = "remoteId" in n ? new Date() : undefined
  const remoteIdHex = base16.encode(remoteId) as Hex
  const remoteIdBase64url = base64url
    .encode(remoteId)
    .substring(0, 22) as RemoteTemplateId
  if (n.templateType.tag === "standard") {
    for (const t of n.templateType.templates) {
      t.front = await replaceImgSrcs(t.front, remoteIdBase64url)
      t.back = await replaceImgSrcs(t.back, remoteIdBase64url)
    }
  } else {
    n.templateType.template.front = await replaceImgSrcs(
      n.templateType.template.front,
      remoteIdBase64url
    )
    n.templateType.template.back = await replaceImgSrcs(
      n.templateType.template.back,
      remoteIdBase64url
    )
  }
  const templateCreate: InsertObject<DB, "Template"> & { nook: NookId } = {
    id: unhex(remoteIdHex),
    ankiId: n.ankiId,
    updatedAt,
    name: n.name,
    nook,
    type: JSON.stringify(n.templateType),
    fields: JSON.stringify(n.fields),
    css: n.css,
  }
  return { templateCreate, remoteIdBase64url }
}

export async function editNotes(authorId: UserId, notes: EditRemoteNote[]) {
  const editNoteIds = notes
    .flatMap((t) => Array.from(t.remoteIds.keys()))
    .map(fromBase64Url)
  const count = await db
    .selectFrom("Note")
    .select(db.fn.count("id").as("c"))
    .where("id", "in", editNoteIds)
    .executeTakeFirstOrThrow()
  if (count.c !== notes.length.toString())
    throwExp("At least one of these notes doesn't exist.")
  const noteCreates = await Promise.all(
    notes.map(async (n) => {
      const tcs = await toNoteCreates(n, authorId)
      return tcs.map((tc) => tc.noteCreate)
    })
  )
  // insert into `Note` (`id`, `templateId`, `authorId`, `fieldValues`, `fts`, `tags`)
  // values (UNHEX(?), FROM_BASE64(?), ?, ?, ?, ?)
  // on duplicate key update `templateId` = values(`templateId`), `updatedAt` = values(`updatedAt`), `authorId` = values(`authorId`), `fieldValues` = values(`fieldValues`), `fts` = values(`fts`), `tags` = values(`tags`), `ankiId` = values(`ankiId`)
  await db
    .insertInto("Note")
    .values(noteCreates.flat())
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

export async function editTemplates(
  authorId: UserId,
  templates: EditRemoteTemplate[]
) {
  const editTemplateIds = templates
    .flatMap((t) => t.remoteIds)
    .map(fromBase64Url)
  const count = await db
    .selectFrom("Template")
    .select(db.fn.count("id").as("c"))
    .where("id", "in", editTemplateIds)
    .executeTakeFirstOrThrow()
  if (count.c !== editTemplateIds.length.toString())
    throwExp("At least one of these templates doesn't exist.")
  const templateCreates = await Promise.all(
    templates.map(async (n) => {
      const tcs = await toTemplateCreates(n, authorId)
      return tcs.map((tc) => tc.templateCreate)
    })
  )
  await db
    .insertInto("Template")
    .values(templateCreates.flat())
    // https://stackoverflow.com/a/34866431
    .onDuplicateKeyUpdate({
      ankiId: (x) => values(x.ref("ankiId")),
      // createdAt: (x) => values(x.ref("createdAt")),
      updatedAt: (x) => values(x.ref("updatedAt")),
      name: (x) => values(x.ref("name")),
      // nook: (x) => values(x.ref("nook")), do not update Nook!
      type: (x) => values(x.ref("type")),
      fields: (x) => values(x.ref("fields")),
      css: (x) => values(x.ref("css")),
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

export function dbIdToBase64Url(dbId: DbId): Base64Url {
  const array = Uint8Array.from(dbId.split("").map((b) => b.charCodeAt(0))) // https://github.com/planetscale/database-js/issues/78#issuecomment-1376435565
  return base64url.encode(array).substring(0, 22) as Base64Url
}
