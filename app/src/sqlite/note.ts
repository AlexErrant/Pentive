import { CreateRemoteNote, RemoteNoteId, throwExp } from "shared"
import { NoteId, RemoteMediaNum, MediaId } from "../domain/ids"
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
    remoteId,
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
    remoteId: remoteId ?? null,
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
    remoteId: note.remoteId ?? undefined,
    pushTemplateId: note.pushTemplateId ?? undefined,
    templateId: note.templateId,
    tags: new Set(JSON.parse(note.tags) as string[]),
    fieldValues,
    ankiNoteId: note.ankiNoteId ?? undefined,
  }
  if (r.push === undefined) {
    delete r.push
  }
  if (r.remoteId === undefined) {
    delete r.remoteId
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
  prepareAndGetNewNotesToUpload: async function () {
    const db = await getKysely()
    const dp = new DOMParser()
    const notesAndStuff = await db
      .selectFrom("note")
      .selectAll()
      .where("push", "=", 1)
      .where("remoteId", "is", null)
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
    const mediaBinaries = await db
      .selectFrom("media")
      .select(["id", "data"])
      .where("id", "in", srcs)
      .execute()
    const media = new Map<
      MediaId,
      { data: ArrayBuffer; ids: Array<[NoteId, RemoteMediaNum]> }
    >(mediaBinaries.map(({ id, data }) => [id, { data, ids: [] }]))
    if (mediaBinaries.length !== srcs.length)
      throwExp("You're missing a media.") // medTODO better error message
    for (const { note, localMediaIdByRemoteMediaId } of notesAndStuff) {
      for (const [
        remoteMediaNum,
        localMediaId,
      ] of localMediaIdByRemoteMediaId) {
        const value =
          media.get(localMediaId) ??
          throwExp(`mediaMap is missing '${localMediaId}'... how?`)
        value.ids.push([note.localId, remoteMediaNum])
      }
      await db
        .insertInto("remoteMedia")
        .values(
          Array.from(localMediaIdByRemoteMediaId).map(([i, localMediaId]) => ({
            localEntityId: note.localId,
            i,
            localMediaId,
          }))
        )
        .execute()
    }
    return { media, notes: notesAndStuff.map((n) => n.note) }
  },
  updateRemoteIds: async function (
    remoteIdByLocal: Record<NoteId, RemoteNoteId>
  ) {
    const db = await getKysely()
    for (const noteId in remoteIdByLocal) {
      const remoteId = remoteIdByLocal[noteId as NoteId]
      await db
        .updateTable("note")
        .set({ remoteId, push: null })
        .where("id", "=", noteId as NoteId)
        .execute()
    }
  },
  updateUploadDate: async function (ids: Array<[NoteId, RemoteMediaNum]>) {
    const db = await getKysely()
    for (const [localEntityId, i] of ids) {
      await db
        .updateTable("remoteMedia")
        .set({ uploadDate: new Date().getTime() })
        .where("localEntityId", "=", localEntityId)
        .where("i", "=", i)
        .execute()
    }
  },
  updateNote: async function (note: Note) {
    const db = await getKysely()
    const { id, ...rest } = noteToDocType(note)
    await db.updateTable("note").set(rest).where("id", "=", id).execute()
  },
}

function withLocalMediaIdByRemoteMediaId(
  dp: DOMParser,
  note: CreateRemoteNote
): {
  note: CreateRemoteNote
  localMediaIdByRemoteMediaId: Map<RemoteMediaNum, MediaId>
} {
  let i = 0 as RemoteMediaNum
  const localMediaIdByRemoteMediaId = new Map<RemoteMediaNum, MediaId>()
  const fieldValues = new Map<string, string>()
  for (const field in note.fieldValues) {
    const doc = dp.parseFromString(note.fieldValues[field], "text/html")
    for (const image of doc.images) {
      const src = image.getAttribute("src")
      if (src != null) {
        // Filter no-src images - grep 330CE329-B962-4E68-90F3-F4F3700815DA
        image.setAttribute("src", i.toString())
        localMediaIdByRemoteMediaId.set(i, src as MediaId)
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
