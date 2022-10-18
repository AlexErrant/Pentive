import { RxCollection, RxDocument, KeyFunctionMap } from "rxdb"
import { Note } from "../../src/domain/note"
import { NoteId } from "../../src/domain/ids"
import { NoteDocType } from "./note.schema"
import { getDb } from "./rxdb"
import _ from "lodash"

function noteToDocType(note: Note): NoteDocType {
  const { id, created, modified, push, pushId, pushTemplateId, ...shrunken } =
    note // https://stackoverflow.com/a/66899790
  return {
    id,
    created: created.toISOString(),
    modified: modified.toISOString(),
    push: push === true ? 1 : 0,
    pushId,
    pushTemplateId,
    data: shrunken,
  }
}

interface NoteDocMethods extends KeyFunctionMap {}

export type NoteDocument = RxDocument<NoteDocType, NoteDocMethods>

// and then merge all our types
export type NoteCollection = RxCollection<NoteDocType, NoteDocMethods>

export const noteDocMethods: NoteDocMethods = {}

function entityToDomain(note: NoteDocument): Note {
  const r = {
    id: note.id as NoteId,
    created: new Date(note.created),
    modified: new Date(note.modified),
    push: note.push === 1 ? true : undefined,
    pushId: note.pushId,
    pushTemplateId: note.pushTemplateId,
    ...(note.data as object),
  }
  // @ts-expect-error Unsure why `type` is in `data` - it's not there when inserted. RxDB or PouchDB or something adds it. Removing to make roundtrip testing easier.
  delete r.type
  if (r.push === undefined) {
    delete r.push
  }
  if (r.pushId === undefined) {
    delete r.pushId
  }
  if (r.pushTemplateId === undefined) {
    delete r.pushTemplateId
  }
  return r as Note
  // Returning dates are *sometimes* strings.
  // The first return after a page refresh is a string because IndexedDb can't handle Date and serializes it.
  // After an upsert, the return is a Date Object because RxDB caches the upserted object... I think.
}

export const noteCollectionMethods = {
  upsertNote: async function (note: Note) {
    const db = await getDb()
    await db.notes.upsert(noteToDocType(note))
  },
  bulkUpsertNotes: async function (notes: Note[]) {
    const db = await getDb()
    const batches = _.chunk(notes.map(noteToDocType), 1000)
    for (let i = 0; i < batches.length; i++) {
      console.log("note batch", i)
      await db.notes.bulkUpsert(batches[i])
    }
  },
  getNote: async function (noteId: NoteId) {
    const db = await getDb()
    const note = await db.notes.findOne(noteId).exec()
    return note == null ? null : entityToDomain(note)
  },
  getNotes: async function (this: NoteCollection) {
    const db = await getDb()
    const allNotes = await db.notes.find().exec()
    return allNotes.map(entityToDomain)
  },
}
