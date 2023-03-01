import {
  CreateRemoteNote,
  EditRemoteNote,
  NookId,
  RemoteNoteId,
  parseMap,
  parseSet,
  stringifyMap,
  stringifySet,
  throwExp,
} from "shared"
import {
  NoteId,
  RemoteMediaNum,
  MediaId,
  RemoteTemplateId,
} from "../domain/ids"
import { Note } from "../domain/note"
import { getKysely } from "./crsqlite"
import { DB, Note as NoteEntity, RemoteNote } from "./database"
import { InsertObject } from "kysely"
import _ from "lodash"

function noteToDocType(note: Note): InsertObject<DB, "note"> {
  const r: InsertObject<DB, "note"> = {
    id: note.id,
    templateId: note.templateId,
    created: note.created.getTime(),
    modified: note.modified.getTime(),
    tags: stringifySet(note.tags),
    fieldValues: stringifyMap(note.fieldValues),
    ankiNoteId: note.ankiNoteId,
  }
  return r
}

function domainToCreateRemote(
  { id, tags, fieldValues }: Note,
  remoteTemplateIds: RemoteTemplateId[]
): CreateRemoteNote {
  return {
    localId: id,
    remoteTemplateIds,
    fieldValues,
    tags: Array.from(tags),
  }
}

function domainToEditRemote(
  note: Note,
  remoteIds: Map<RemoteNoteId, RemoteTemplateId>
) {
  const r: EditRemoteNote = {
    remoteIds,
    fieldValues: note.fieldValues,
    tags: Array.from(note.tags),
  }
  return r
}

function entityToDomain(note: NoteEntity, remotes: RemoteNote[]): Note {
  const r: Note = {
    id: note.id as NoteId,
    created: new Date(note.created),
    modified: new Date(note.modified),
    templateId: note.templateId,
    tags: parseSet(note.tags),
    fieldValues: parseMap(note.fieldValues),
    ankiNoteId: note.ankiNoteId ?? undefined,
    remotes: new Map(remotes.map((r) => [r.nook, r.remoteId])),
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
    const remoteNotes = await db
      .selectFrom("remoteNote")
      .selectAll()
      .where("localId", "=", noteId)
      .execute()
    const note = await db
      .selectFrom("note")
      .selectAll()
      .where("id", "=", noteId)
      .executeTakeFirst()
    return note == null ? null : entityToDomain(note, remoteNotes)
  },
  getNotesByIds: async function (noteIds: NoteId[]) {
    const db = await getKysely()
    const remoteNotes = await db
      .selectFrom("remoteNote")
      .selectAll()
      .where("localId", "in", noteIds)
      .execute()
    const notes = await db
      .selectFrom("note")
      .selectAll()
      .where("id", "in", noteIds)
      .execute()
    return notes.map((ln) =>
      entityToDomain(
        ln,
        remoteNotes.filter((rn) => rn.localId === ln.id)
      )
    )
  },
  getNewNotesToUpload: async function () {
    const db = await getKysely()
    const dp = new DOMParser()
    const remoteNotes = await db
      .selectFrom("remoteNote")
      .selectAll()
      .where("remoteId", "is", null)
      .execute()
    const localIds = [...new Set(remoteNotes.map((t) => t.localId))]
    const remoteTemplates = await db
      .selectFrom("remoteTemplate")
      .selectAll()
      .execute()
    const notesAndStuff = await db
      .selectFrom("note")
      .selectAll()
      .where("id", "in", localIds)
      .execute()
      .then((n) =>
        n
          .map((noteEntity) => {
            const note = entityToDomain(
              noteEntity,
              remoteNotes.filter((rn) => rn.localId === noteEntity.id)
            )
            if (note.remotes.size === 0)
              throwExp("Zero remotes - is something wrong with the SQL query?")
            const remoteIds = Array.from(note.remotes).map(([nook]) => {
              const rt =
                remoteTemplates.find(
                  (rt) => rt.localId === note.templateId && nook === rt.nook
                ) ??
                throwExp(
                  `No template found for id '${note.templateId}' with nook '${nook}'.`
                )
              return (
                (rt.remoteId as RemoteTemplateId) ??
                throwExp(`Template ${rt.localId} has no remoteId.`)
              )
            })
            return domainToCreateRemote(note, remoteIds)
          })
          .map((n) => withLocalMediaIdByRemoteMediaId(dp, n))
      )
    return notesAndStuff.map((n) => n.note)
  },
  getEditedNotesToUpload: async function () {
    const db = await getKysely()
    const dp = new DOMParser()
    const remoteNotes = await db
      .selectFrom("remoteNote")
      .leftJoin("note", "remoteNote.localId", "note.id")
      .selectAll("remoteNote")
      .where("remoteId", "is not", null)
      .whereRef("remoteNote.uploadDate", "<", "note.modified")
      .execute()
    const localIds = [...new Set(remoteNotes.map((t) => t.localId))]
    const remoteTemplates = await db
      .selectFrom("remoteTemplate")
      .selectAll()
      .execute()
    const notesAndStuff = await db
      .selectFrom("note")
      .selectAll()
      .where("id", "in", localIds)
      .execute()
      .then((n) =>
        n
          .map((noteEntity) => {
            const note = entityToDomain(
              noteEntity,
              remoteNotes.filter((rn) => rn.localId === noteEntity.id)
            )
            if (note.remotes.size === 0)
              throwExp("Zero remotes - is something wrong with the SQL query?")
            const remotes = new Map(
              Array.from(note.remotes).map(([nook, remoteNoteId]) => {
                const rt =
                  remoteTemplates.find(
                    (rt) => rt.localId === note.templateId && nook === rt.nook
                  ) ??
                  throwExp(
                    `No template found for id '${note.templateId}' with nook '${nook}'.`
                  )
                return [
                  remoteNoteId ??
                    throwExp(
                      `remoteNoteId for ${JSON.stringify({
                        nook,
                        noteEntityId: noteEntity.id,
                      })} is null.`
                    ),
                  rt.remoteId ??
                    throwExp(
                      `remoteId for ${JSON.stringify({
                        nook,
                        noteEntityId: noteEntity.id,
                      })} is null.`
                    ),
                ]
              })
            )
            return domainToEditRemote(note, remotes)
          })
          .map((n) => withLocalMediaIdByRemoteMediaId(dp, n))
      )
    return notesAndStuff.map((n) => n.note)
  },
  getNoteMediaToUpload: async function () {
    const db = await getKysely()
    const mediaBinaries = await db
      .selectFrom("remoteMedia")
      .innerJoin("media", "remoteMedia.localMediaId", "media.id")
      .leftJoin("note", "remoteMedia.localEntityId", "note.id")
      .leftJoin("remoteNote", "remoteNote.localId", "note.id")
      .select([
        "remoteMedia.localMediaId",
        "media.data",
        "remoteMedia.localEntityId",
        "remoteMedia.i",
        "remoteNote.remoteId",
      ])
      .where("remoteMedia.uploadDate", "is", null)
      .orWhereRef("media.modified", ">", "remoteMedia.uploadDate")
      .execute()
    const media = new Map<
      MediaId,
      { data: ArrayBuffer; ids: Array<[NoteId, RemoteNoteId, RemoteMediaNum]> }
    >(
      mediaBinaries.map(({ localMediaId, data }) => [
        localMediaId,
        { data, ids: [] },
      ])
    )
    for (const m of mediaBinaries) {
      const remoteId =
        m.remoteId ??
        throwExp(
          `Note media ${m.localMediaId} is missing a remoteId, is something wrong with the SQL query?`
        )
      const value =
        media.get(m.localMediaId) ??
        throwExp(`mediaBinaries is missing '${m.localMediaId}'... how?`)
      value.ids.push([m.localEntityId, remoteId, m.i])
    }
    return media
  },
  makeNoteUploadable: async function (noteId: NoteId, nook: NookId) {
    const remoteNote = {
      localId: noteId,
      nook,
      remoteId: null,
      uploadDate: null,
    }
    const db = await getKysely()
    await db.transaction().execute(async (db) => {
      await db
        .insertInto("remoteNote")
        .values(remoteNote)
        .onConflict((db) => db.doNothing())
        .execute()
      const note = await db
        .selectFrom("note")
        .selectAll()
        .where("id", "=", noteId)
        .executeTakeFirstOrThrow()
      const { localMediaIdByRemoteMediaId } = withLocalMediaIdByRemoteMediaId(
        new DOMParser(),
        domainToCreateRemote(entityToDomain(note, [remoteNote]), [
          /* this doesn't need any real values... I think */
        ])
      )
      const srcs = Array.from(localMediaIdByRemoteMediaId.values())
      const mediaBinaries = await db
        .selectFrom("media")
        .select(["id", "data"])
        .where("id", "in", srcs)
        .execute()
      if (mediaBinaries.length !== srcs.length)
        throwExp("You're missing a media.") // medTODO better error message
      await db
        .deleteFrom("remoteMedia")
        .where("localEntityId", "=", noteId)
        .where("i", ">", srcs.length as RemoteMediaNum)
        .execute()
      await db
        .insertInto("remoteMedia")
        .values(
          Array.from(localMediaIdByRemoteMediaId).map(([i, localMediaId]) => ({
            localEntityId: noteId,
            i,
            localMediaId,
          }))
        )
        // insert into "remoteMedia" ("localEntityId", "i", "localMediaId") values (?, ?, ?)
        // on conflict do update set "localMediaId" = "excluded"."localMediaId"
        .onConflict((db) =>
          db.doUpdateSet({
            localMediaId: (x) => x.ref("excluded.localMediaId"),
          })
        )
        .execute()
    })
  },
  updateNoteRemoteIds: async function (
    remoteIdByLocal: Map<readonly [NoteId, NookId], RemoteNoteId>
  ) {
    const db = await getKysely()
    for (const [[noteId, nook], remoteId] of remoteIdByLocal) {
      const r = await db
        .updateTable("remoteNote")
        .set({ remoteId, uploadDate: new Date().getTime() })
        .where("nook", "=", nook)
        .where("localId", "=", noteId)
        .returningAll()
        .execute()
      if (r.length !== 1)
        throwExp(
          `No remoteNote found for nook '${nook}' and noteId '${noteId}'`
        )
    }
  },
  markNoteAsPushed: async function (remoteNoteIds: RemoteNoteId[]) {
    const db = await getKysely()
    const r = await db
      .updateTable("remoteNote")
      .set({ uploadDate: new Date().getTime() })
      .where("remoteId", "in", remoteNoteIds)
      .returningAll()
      .execute()
    if (r.length !== remoteNoteIds.length)
      throwExp(
        `Some remoteNotes in ${JSON.stringify(
          remoteNoteIds
        )} not found. (This is the worst error message ever - medTODO.)`
      )
  },
  updateNote: async function (note: Note) {
    const db = await getKysely()
    const { id, ...rest } = noteToDocType({
      ...note,
      modified: new Date(),
    })
    const r = await db
      .updateTable("note")
      .set(rest)
      .where("id", "=", id)
      .returningAll()
      .execute()
    if (r.length !== 1) throwExp(`No note found for id '${note.id}'.`)
  },
}

function withLocalMediaIdByRemoteMediaId<
  T extends CreateRemoteNote | EditRemoteNote
>(dp: DOMParser, note: T) {
  const localMediaIdByRemoteMediaId = new Map<RemoteMediaNum, MediaId>()
  const fieldValues = new Map<string, string>()
  for (const [field, value] of note.fieldValues) {
    const doc = updateLocalMediaIdByRemoteMediaIdAndGetNewDoc(
      dp,
      value,
      localMediaIdByRemoteMediaId
    )
    fieldValues.set(field, doc.body.innerHTML)
  }
  return {
    note: {
      ...note,
      fieldValues,
    },
    localMediaIdByRemoteMediaId,
  }
}

export function updateLocalMediaIdByRemoteMediaIdAndGetNewDoc(
  dp: DOMParser,
  rawDom: string,
  localMediaIdByRemoteMediaId: Map<RemoteMediaNum, MediaId>
) {
  const doc = dp.parseFromString(rawDom, "text/html")
  for (const image of doc.images) {
    const src = image.getAttribute("src")
    if (src != null) {
      // Filter no-src images - grep 330CE329-B962-4E68-90F3-F4F3700815DA
      const i = localMediaIdByRemoteMediaId.size as RemoteMediaNum
      image.setAttribute("src", i.toString())
      localMediaIdByRemoteMediaId.set(i, src as MediaId)
    }
  }
  return doc
}
