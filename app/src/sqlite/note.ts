import { CreateRemoteNote, throwExp } from "shared"
import { NoteId, ResourceId } from "../domain/ids"
import { Note } from "../domain/note"
import { getKysely } from "./crsqlite"
import { DB, Note as NoteEntity } from "./database"
import { InsertObject } from "kysely"
import _ from "lodash"

function noteToDocType(note: Note): InsertObject<DB, "note"> {
  const {
    id,
    created,
    modified,
    push,
    pushId,
    tags,
    fieldValues,
    templateId,
    ankiNoteId,
    pushTemplateId,
  } = note
  return {
    id,
    templateId,
    created: created.getTime(),
    modified: modified.getTime(),
    push: push === true ? 1 : 0,
    pushId: pushId ?? null,
    tags: JSON.stringify([...tags]),
    fieldValues: JSON.stringify(fieldValues),
    ankiNoteId,
    pushTemplateId,
  }
}

function domainToCreateRemote({
  id,
  pushTemplateId,
  tags,
  fieldValues,
}: Note): CreateRemoteNote {
  return {
    localId: id,
    templateId:
      pushTemplateId ??
      throwExp(
        `Note ${id} is missing a pushTemplateId... is something wrong with the SQL query?`
      ),
    fieldValues,
    tags: Array.from(tags),
  }
}

function entityToDomain(note: NoteEntity): Note {
  const fieldValues = JSON.parse(note.fieldValues) as Record<string, string>
  const r = {
    id: note.id as NoteId,
    created: new Date(note.created),
    modified: new Date(note.modified),
    push: note.push === 1 ? (true as const) : undefined,
    pushId: note.pushId ?? undefined,
    pushTemplateId: note.pushTemplateId ?? undefined,
    templateId: note.templateId,
    tags: new Set(JSON.parse(note.tags) as string[]),
    fieldValues,
    ankiNoteId: note.ankiNoteId ?? undefined,
  }
  if (r.push === undefined) {
    delete r.push
  }
  if (r.pushId === undefined) {
    delete r.pushId
  }
  if (r.pushTemplateId === undefined) {
    delete r.pushTemplateId
  }
  if (r.ankiNoteId === undefined) {
    delete r.ankiNoteId
  }
  return r
}

export const noteCollectionMethods = {
  upsertNote: async function (note: Note) {
    const db = await getKysely()
    await db.insertInto("note").values(noteToDocType(note)).execute()
  },
  bulkUpsertNotes: async function (notes: Note[]) {
    const db = await getKysely()
    const batches = _.chunk(notes.map(noteToDocType), 1000)
    for (let i = 0; i < batches.length; i++) {
      console.log("note batch", i)
      await db.insertInto("note").values(batches[i]).execute()
    }
  },
  getNote: async function (noteId: NoteId) {
    const db = await getKysely()
    const note = await db
      .selectFrom("note")
      .selectAll()
      .where("id", "=", noteId)
      .executeTakeFirst()
    return note == null ? null : entityToDomain(note)
  },
  getNotesByIds: async function (noteIds: NoteId[]) {
    const db = await getKysely()
    const notes = await db
      .selectFrom("note")
      .selectAll()
      .where("id", "in", noteIds)
      .execute()
    return notes.map(entityToDomain)
  },
  getNotes: async function (exclusiveStartId?: NoteId, limit?: number) {
    const db = await getKysely()
    const allNotes = await db
      .selectFrom("note")
      .selectAll()
      .if(exclusiveStartId != null, (x) =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        x.where("id", ">", exclusiveStartId!)
      )
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .if(limit != null, (x) => x.limit(limit!))
      .execute()
    return allNotes.map(entityToDomain)
  },
  getNewNotesToUpload: async function () {
    const db = await getKysely()
    const dp = new DOMParser()
    const notesAndStuff = await db
      .selectFrom("note")
      .selectAll()
      .where("push", "=", 1)
      .where("pushId", "is", null)
      .execute()
      .then((n) =>
        n
          .map(entityToDomain)
          .map(domainToCreateRemote)
          .map((n) => withLocalMediaIdByRemoteMediaId(dp, n))
      )
    const srcs = notesAndStuff.flatMap((n) =>
      Array.from(n.localMediaIdByRemoteMediaId.values())
    )
    const resources = await db
      .selectFrom("resource")
      .select(["id", "data"])
      .where("id", "in", srcs)
      .execute()
    if (resources.length !== srcs.length) throwExp("You're missing a resource.") // medTODO better error message
    return { resources, notes: notesAndStuff.map((n) => n.note) }
  },
}

function withLocalMediaIdByRemoteMediaId(
  dp: DOMParser,
  note: CreateRemoteNote
): {
  note: CreateRemoteNote
  localMediaIdByRemoteMediaId: Map<number, ResourceId>
} {
  let i = 0
  const localMediaIdByRemoteMediaId = new Map<number, ResourceId>()
  const fieldValues = new Map<string, string>()
  for (const field in note.fieldValues) {
    const doc = dp.parseFromString(note.fieldValues[field], "text/html")
    for (const image of doc.images) {
      const src = image.getAttribute("src")
      if (src != null) {
        image.setAttribute("src", i.toString())
        localMediaIdByRemoteMediaId.set(i, src as ResourceId)
        i++
      }
    }
    fieldValues.set(field, doc.body.innerHTML)
  }
  return {
    note: {
      ...note,
      fieldValues: Object.fromEntries(fieldValues),
    },
    localMediaIdByRemoteMediaId,
  }
}
