import {
  Kysely,
  sql,
  type InsertResult,
  type RawBuilder,
  type InsertObject,
  type Compilable,
} from "kysely"
import { PlanetScaleDialect } from "kysely-planetscale"
import { type DB } from "../database.js"
import {
  type Base64,
  type Base64Url,
  type DbId,
  type Hex,
  type NookId,
  type NoteCommentId,
  type NoteId,
  type RemoteNoteId,
  type RemoteTemplateId,
  type TemplateId,
  type UserId,
  type RemoteNote,
  type CreateRemoteNote,
  type CreateRemoteTemplate,
  type EditRemoteNote,
  type EditRemoteTemplate,
  type RemoteTemplate,
  type TemplateType,
  imgPlaceholder,
  relativeChar,
} from "shared"
import { binary16fromBase64URL, ulidAsHex, ulidAsRaw } from "./convertBinary.js"
import { nullMap, parseMap, stringifyMap, throwExp, undefinedMap } from "shared"
import { base16, base64url } from "@scure/base"
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
    .selectFrom("post")
    .select(["id", "title", "text", "authorId"])
    .where("nook", "=", nook)
    .execute()
    .then((ps) => ps.map(mapIdToBase64Url))
}

function toTemplate(
  x: {
    templateId: DbId
    templateName: string
    templateCreated: Date
    templateUpdated: Date
    nook: string
    css: string
    type: string
    fields: string
  },
  templateId: RemoteTemplateId
): RemoteTemplate {
  return {
    id: templateId,
    name: x.templateName,
    nook: x.nook as NookId,
    created: x.templateCreated,
    updated: x.templateUpdated,
    fields: deserializeFields(x.fields),
    css: x.css,
    templateType: deserializeTemplateType(x.type),
  }
}

function noteToNookView(x: {
  id: DbId
  templateId: DbId
  templateName: string
  templateCreated: Date
  templateUpdated: Date
  noteCreated: Date
  noteUpdated: Date
  tags: string
  nook: string
  fieldValues: string
  css: string
  type: string
  fields: string
  subscribers: number
  comments: number
  til?: Date
}) {
  const noteId = dbIdToBase64Url(x.id) as RemoteNoteId
  const templateId = dbIdToBase64Url(x.templateId) as RemoteTemplateId
  return {
    id: noteId,
    subscribers: x.subscribers,
    comments: x.comments,
    til: x.til,
    note: toNote(x, noteId, templateId),
    template: toTemplate(x, templateId),
  }
}

function toNote(
  x: {
    nook: string
    fieldValues: string
    id: DbId
    templateId: DbId
    ankiNoteId?: number
    noteCreated: Date
    noteUpdated: Date
    tags: string
  },
  noteId: RemoteNoteId,
  templateId: RemoteTemplateId
): RemoteNote {
  return {
    nook: x.nook as NookId,
    fieldValues: deserializeFieldValues(x.fieldValues),
    id: noteId,
    templateId,
    created: x.noteCreated,
    updated: x.noteUpdated,
    tags: deserializeTags(x.tags),
    ankiId: x.ankiNoteId,
  }
}

export async function getUserIdByEmail(email: string) {
  return await db
    .selectFrom("user")
    // Emails are case sensitive, so lookups are case sensitive for max security
    .where(sql`binary \`email\``, "=", email)
    .select(["id"])
    .executeTakeFirst()
}

export async function getCasedUserId(userId: string) {
  return await db
    .selectFrom("user")
    .where("id", "=", userId)
    .select(["id"])
    .executeTakeFirst()
}

export async function registerUser(id: string, email: string) {
  await db.insertInto("user").values({ id, email }).execute()
}

export async function getNotes(nook: NookId, userId: UserId | null) {
  const r = await db
    .selectFrom("note")
    .innerJoin("template", "template.id", "note.templateId")
    .select([
      "note.id",
      "note.fieldValues",
      "note.created as noteCreated",
      "note.updated as noteUpdated",
      "note.tags",
      "note.subscribersCount as subscribers",
      "note.commentsCount as comments",
      "template.id as templateId",
      "template.name as templateName",
      "template.created as templateCreated",
      "template.updated as templateUpdated",
      "template.nook as nook",
      "template.css",
      "template.fields",
      "template.type",
    ])
    .$if(userId != null, (a) =>
      a.select((b) =>
        b
          .selectFrom("noteSubscriber")
          .select(["til"])
          .where("userId", "=", userId)
          .whereRef("noteSubscriber.noteId", "=", "note.id")
          .as("til")
      )
    )
    .where("template.nook", "=", nook)
    .execute()
  return r.map(noteToNookView)
}

export async function getNote(noteId: RemoteNoteId, userId: UserId | null) {
  const r = await db
    .selectFrom("note")
    .innerJoin("template", "template.id", "note.templateId")
    .select([
      "note.templateId",
      "note.created",
      "note.updated",
      "note.authorId",
      "note.fieldValues",
      "note.tags",
      "note.ankiId",
      "template.id as templateId",
      "template.name as templateName",
      "template.created as templateCreated",
      "template.updated as templateUpdated",
      "template.nook as nook",
      "template.css",
      "template.fields",
      "template.type",
    ])
    .$if(userId != null, (a) =>
      a.select((b) =>
        b
          .selectFrom("noteSubscriber")
          .select(["til"])
          .where("userId", "=", userId)
          .whereRef("noteSubscriber.noteId", "=", "note.id")
          .as("til")
      )
    )
    .where("note.id", "=", fromBase64Url(noteId))
    .executeTakeFirst()
  if (r == null) return null
  return {
    id: noteId,
    templateId: dbIdToBase64Url(r.templateId) as RemoteTemplateId,
    created: r.created,
    updated: r.updated,
    authorId: r.authorId as UserId,
    fieldValues: deserializeFieldValues(r.fieldValues),
    tags: deserializeTags(r.tags),
    ankiId: r.ankiId ?? undefined,
    til: r.til,
    nook: r.nook,
    template: toTemplate(r, dbIdToBase64Url(r.templateId) as TemplateId),
  }
}

// https://stackoverflow.com/a/18018037
function listToTree(list: NoteComment[]) {
  const map = new Map<Base64Url, number>()
  let node
  const roots = []
  let i
  for (i = 0; i < list.length; i += 1) {
    map.set(list[i].id, i)
  }
  for (i = 0; i < list.length; i += 1) {
    node = list[i]
    if (node.parentId !== null) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      list[map.get(node.parentId)!].comments.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export interface NoteComment {
  id: NoteCommentId
  parentId: NoteCommentId | null
  noteId: DbId
  created: Date
  updated: Date
  text: string
  authorId: string
  votes: string
  level: number
  comments: NoteComment[]
}

export async function getNoteComments(noteId: RemoteNoteId) {
  const cs = await db
    .selectFrom("noteComment")
    .select([
      "id",
      "parentId",
      "created",
      "updated",
      "text",
      "authorId",
      "votes",
      "level",
    ])
    .where("noteComment.noteId", "=", fromBase64Url(noteId))
    .orderBy("level", "asc")
    .orderBy("votes", "desc")
    .execute()
  const commentsList = cs.map((c) => {
    const r: NoteComment = {
      id: dbIdToBase64Url(c.id) as NoteCommentId,
      parentId: nullMap(c.parentId, dbIdToBase64Url) as NoteCommentId | null,
      noteId,
      created: c.created,
      updated: c.updated,
      text: c.text,
      authorId: c.authorId as UserId,
      votes: c.votes,
      level: c.level,
      comments: [],
    }
    return r
  })
  return listToTree(commentsList)
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
    .selectFrom("post")
    .select(["id", "title", "text", "authorId"])
    .where("id", "=", fromBase64Url(id))
    .executeTakeFirst()
    .then((x) => undefinedMap(x, mapIdToBase64Url))
}

export async function getTemplate(id: RemoteTemplateId, nook?: NookId) {
  const t = await db
    .selectFrom("template")
    .selectAll()
    .where("id", "=", fromBase64Url(id))
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .$if(nook != null, (db) => db.where("nook", "=", nook!))
    .executeTakeFirst()
  return undefinedMap(t, templateEntityToDomain)
}

export async function getTemplates(nook: NookId) {
  const ts = await db
    .selectFrom("template")
    .selectAll()
    .where("nook", "=", nook)
    .execute()
  return ts.map(templateEntityToDomain)
}

function templateEntityToDomain(t: {
  id: DbId
  created: Date
  updated: Date
  name: string
  nook: NookId
  type: string
  fields: string
  css: string
  ankiId: number | null
}) {
  const r: RemoteTemplate = {
    id: dbIdToBase64Url(t.id) as RemoteTemplateId,
    name: t.name,
    nook: t.nook,
    css: t.css,
    fields: deserializeFields(t.fields),
    created: t.created,
    updated: t.updated,
    templateType: deserializeTemplateType(t.type),
  }
  return r
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
    .insertInto("post")
    .values({
      id: unhex(id),
      authorId,
      nook,
      text,
      title,
    })
    .execute()
}

export async function insertNoteComment(
  noteId: RemoteNoteId,
  text: string,
  authorId: UserId
) {
  const noteDbId = fromBase64Url(noteId)
  await db.transaction().execute(
    async (tx) =>
      await Promise.all([
        db
          .selectFrom("note")
          .select(["id"])
          .where("note.id", "=", noteDbId)
          .executeTakeFirst()
          .then((r) => {
            if (r == null) throwExp(`Note ${noteId} not found.`)
          }),
        tx
          .updateTable("note")
          .set({
            commentsCount: (x) => sql`${x.ref("commentsCount")} + 1`,
          })
          .where("note.id", "=", noteDbId)
          .execute(),
        tx
          .insertInto("noteComment")
          .values({
            id: unhex(ulidAsHex()),
            authorId,
            level: 0,
            noteId: noteDbId,
            votes: "",
            text,
          })
          .execute(),
      ])
  )
}

export async function insertNoteChildComment(
  parentCommentId: NoteCommentId,
  text: string,
  authorId: UserId
) {
  const parentCommentDbId = fromBase64Url(parentCommentId)
  const parent = await db
    .selectFrom("noteComment")
    .select(["level", sql<Base64>`TO_BASE64(noteId)`.as("noteId")])
    .where("id", "=", parentCommentDbId)
    .executeTakeFirst()
  if (parent == null) throwExp(`Comment ${parentCommentId} not found.`)
  const noteId = fromBase64(parent.noteId)
  await db.transaction().execute(
    async (tx) =>
      await Promise.all([
        tx
          .updateTable("note")
          .set({
            commentsCount: (x) => sql`${x.ref("commentsCount")} + 1`,
          })
          .where("note.id", "=", noteId)
          .execute(),
        await tx
          .insertInto("noteComment")
          .values({
            id: unhex(ulidAsHex()),
            authorId,
            level: parent.level + 1,
            noteId,
            votes: "",
            text,
            parentId: parentCommentDbId,
          })
          .execute(),
      ])
  )
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
        .selectFrom("note")
        .select(db.fn.count("id").as("userOwns"))
        .where("id", "in", ids.map(fromBase64Url))
        .where("authorId", "=", authorId)
        .as("userOwns"),
      db
        .selectFrom("media_Entity")
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
        .selectFrom("template")
        .select(db.fn.count("id").as("userOwns"))
        .where("id", "in", ids.map(fromBase64Url))
        // .where("authorId", "=", authorId) // highTODO
        .as("userOwns"),
      db
        .selectFrom("media_Entity")
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
    .selectFrom("media_Entity")
    .select(sql<Base64>`TO_BASE64(mediaHash)`.as("mediaHash"))
    .where("entityId", "=", fromBase64(entityId))
    .where("i", "=", i)
    .executeTakeFirst()
  return mediaHash?.mediaHash
}

export async function insertNotes(authorId: UserId, notes: CreateRemoteNote[]) {
  const rtIds = Array.from(
    new Set(notes.flatMap((n) => n.remoteTemplateIds))
  ).map(fromBase64Url)
  // highTODO validate author
  const templates = await db
    .selectFrom("template")
    .select(["nook", "id"])
    .where("id", "in", rtIds)
    .execute()
  if (templates.length !== rtIds.length)
    throwExp("You have an invalid RemoteTemplateId.")
  const noteCreatesAndIds = notes.flatMap((n) => {
    const ncs = toNoteCreates(n, authorId)
    return ncs.map(({ noteCreate, remoteIdBase64url, remoteTemplateId }) => {
      const t =
        templates.find((t) => dbIdToBase64Url(t.id) === remoteTemplateId) ??
        throwExp(`Template not found - should be impossible.`)
      return [noteCreate, [[n.localId, t.nook], remoteIdBase64url]] as const
    })
  })
  const noteCreates = noteCreatesAndIds.map((x) => x[0])
  await db.insertInto("note").values(noteCreates).execute()
  const remoteIdByLocal = new Map(noteCreatesAndIds.map((x) => x[1]))
  return remoteIdByLocal
}

export async function insertTemplates(
  authorId: UserId,
  templates: CreateRemoteTemplate[]
) {
  const templateCreatesAndIds = templates.flatMap((n) => {
    const tcs = toTemplateCreates(n, authorId)
    return tcs.map(({ templateCreate, remoteIdBase64url }) => {
      return [
        templateCreate,
        [[n.localId, templateCreate.nook], remoteIdBase64url],
      ] as const
    })
  })
  const templateCreates = templateCreatesAndIds.map((x) => x[0])
  await db.insertInto("template").values(templateCreates).execute()
  const remoteIdByLocal = new Map(templateCreatesAndIds.map((x) => x[1]))
  return remoteIdByLocal
}

export async function subscribeToNote(userId: UserId, noteId: RemoteNoteId) {
  const noteDbId = fromBase64Url(noteId)
  await db.transaction().execute(
    async (tx) =>
      await Promise.all([
        tx
          .selectFrom("note")
          .select(["id"])
          .where("id", "=", noteDbId)
          .executeTakeFirst()
          .then((n) => {
            if (n == null) throwExp(`Note ${noteId} not found.`)
          }),
        tx
          .updateTable("note")
          .set({
            subscribersCount: (x) => sql`${x.ref("subscribersCount")} + 1`,
          })
          .where("note.id", "=", noteDbId)
          .execute(),
        tx
          .insertInto("noteSubscriber")
          .values({
            userId,
            noteId: noteDbId,
          })
          .execute(),
      ])
  )
}

function toNoteCreates(n: EditRemoteNote | CreateRemoteNote, authorId: UserId) {
  const remoteIds =
    "remoteIds" in n
      ? new Map(
          Array.from(n.remoteIds).map(([remoteNoteId, remoteTemplateId]) => [
            base64url.decode(remoteNoteId + "=="),
            remoteTemplateId ??
              throwExp("grep E7F24704-8D0B-460A-BF2C-A97344C535E0"),
          ])
        )
      : new Map(n.remoteTemplateIds.map((rt) => [ulidAsRaw(), rt]))
  return Array.from(remoteIds).map((x) => toNoteCreate(x, n, authorId))
}

function toNoteCreate(
  [remoteNoteId, remoteTemplateId]: [Uint8Array, RemoteTemplateId],
  n: EditRemoteNote | CreateRemoteNote,
  authorId: UserId
) {
  const updated = "remoteId" in n ? new Date() : undefined
  const remoteIdHex = base16.encode(remoteNoteId) as Hex
  const remoteIdBase64url = base64url
    .encode(remoteNoteId)
    .substring(0, 22) as RemoteNoteId
  for (const [field, value] of n.fieldValues) {
    n.fieldValues.set(field, replaceImgSrcs(value, remoteIdBase64url))
  }
  const noteCreate: InsertObject<DB, "note"> = {
    id: unhex(remoteIdHex),
    templateId: fromBase64Url(remoteTemplateId), // highTODO validate
    authorId,
    updated,
    fieldValues: serializeFieldValues(n.fieldValues),
    fts: Array.from(n.fieldValues)
      .map(([, v]) => convert(v))
      .concat(n.tags)
      .join(" "),
    tags: serializeTags(n.tags),
    ankiId: n.ankiId,
  }
  return { noteCreate, remoteIdBase64url, remoteTemplateId }
}

function replaceImgSrcs(value: string, remoteIdBase64url: string) {
  return value.replaceAll(imgPlaceholder, relativeChar + remoteIdBase64url)
}

function toTemplateCreates(
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
  return remoteIds.map(([id, nook]) => toTemplateCreate(n, id, nook))
}

function toTemplateCreate(
  n: EditRemoteTemplate | CreateRemoteTemplate,
  remoteId: Uint8Array,
  nook: NookId
) {
  const updated = "remoteId" in n ? new Date() : undefined
  const remoteIdHex = base16.encode(remoteId) as Hex
  const remoteIdBase64url = base64url
    .encode(remoteId)
    .substring(0, 22) as RemoteTemplateId
  if (n.templateType.tag === "standard") {
    for (const t of n.templateType.templates) {
      t.front = replaceImgSrcs(t.front, remoteIdBase64url)
      t.back = replaceImgSrcs(t.back, remoteIdBase64url)
    }
  } else {
    n.templateType.template.front = replaceImgSrcs(
      n.templateType.template.front,
      remoteIdBase64url
    )
    n.templateType.template.back = replaceImgSrcs(
      n.templateType.template.back,
      remoteIdBase64url
    )
  }
  const templateCreate: InsertObject<DB, "template"> & { nook: NookId } = {
    id: unhex(remoteIdHex),
    ankiId: n.ankiId,
    updated,
    name: n.name,
    nook,
    type: serializeTemplateType(n.templateType),
    fields: serializeFields(n.fields),
    css: n.css,
  }
  return { templateCreate, remoteIdBase64url }
}

// highTODO property test
function serializeTemplateType(tt: TemplateType) {
  return JSON.stringify(tt)
}

function serializeFields(tt: string[]) {
  return JSON.stringify(tt)
}

function serializeFieldValues(fvs: Map<string, string>) {
  return stringifyMap(fvs)
}

function serializeTags(tags: string[]) {
  return JSON.stringify(tags)
}

function deserializeTemplateType(tt: string) {
  return JSON.parse(tt) as TemplateType
}

function deserializeFields(tt: string) {
  return JSON.parse(tt) as string[]
}

function deserializeFieldValues(fvs: string) {
  return parseMap<string, string>(fvs)
}

function deserializeTags(tags: string) {
  return JSON.parse(tags) as string[]
}

export async function editNotes(authorId: UserId, notes: EditRemoteNote[]) {
  const editNoteIds = notes
    .flatMap((t) => Array.from(t.remoteIds.keys()))
    .map(fromBase64Url)
  const count = await db
    .selectFrom("note")
    .select(db.fn.count("id").as("c"))
    .where("id", "in", editNoteIds)
    .executeTakeFirstOrThrow()
  if (count.c !== notes.length.toString())
    throwExp("At least one of these notes doesn't exist.")
  const noteCreates = notes.map((n) => {
    const tcs = toNoteCreates(n, authorId)
    return tcs.map((tc) => tc.noteCreate)
  })
  // insert into `Note` (`id`, `templateId`, `authorId`, `fieldValues`, `fts`, `tags`)
  // values (UNHEX(?), FROM_BASE64(?), ?, ?, ?, ?)
  // on duplicate key update `templateId` = values(`templateId`), `updated` = values(`updated`), `authorId` = values(`authorId`), `fieldValues` = values(`fieldValues`), `fts` = values(`fts`), `tags` = values(`tags`), `ankiId` = values(`ankiId`)
  await db
    .insertInto("note")
    .values(noteCreates.flat())
    // https://stackoverflow.com/a/34866431
    .onDuplicateKeyUpdate({
      templateId: (x) => values(x.ref("templateId")),
      // created: (x) => values(x.ref("created")),
      updated: (x) => values(x.ref("updated")),
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
    .selectFrom("template")
    .select(db.fn.count("id").as("c"))
    .where("id", "in", editTemplateIds)
    .executeTakeFirstOrThrow()
  if (count.c !== editTemplateIds.length.toString())
    throwExp("At least one of these templates doesn't exist.")
  const templateCreates = templates.map((n) => {
    const tcs = toTemplateCreates(n, authorId)
    return tcs.map((tc) => tc.templateCreate)
  })
  await db
    .insertInto("template")
    .values(templateCreates.flat())
    // https://stackoverflow.com/a/34866431
    .onDuplicateKeyUpdate({
      ankiId: (x) => values(x.ref("ankiId")),
      // created: (x) => values(x.ref("created")),
      updated: (x) => values(x.ref("updated")),
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

// use with .$call(log)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function log<T extends Compilable>(qb: T): T {
  console.log("Compiled SQL: ", qb.compile())
  return qb
}
