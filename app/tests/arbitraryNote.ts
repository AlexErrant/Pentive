import fc from "fast-check"
import { Note } from "../src/domain/note"
import { NoteId } from "../src/domain/ids"
import {
  arbitraryUlid,
  reasonableDates,
  recordWithOptionalFields,
} from "./arbitrary"
import { NookId, RemoteNoteId } from "shared"

export const note = recordWithOptionalFields<Note>(
  {
    id: fc.uuidV(4).map((x) => x as NoteId),
    templateId: arbitraryUlid(),
    fieldValues: fc
      .dictionary(fc.string(), fc.string())
      .map((x) => new Map(Object.entries(x))),
    tags: fc.array(fc.string()).map((x) => new Set(x)),
    created: reasonableDates,
    updated: reasonableDates,
    remotes: fc
      .dictionary(fc.string(), arbitraryUlid<RemoteNoteId>())
      .map((x) => new Map(Object.entries(x) as Array<[NookId, RemoteNoteId]>)),
  },
  {
    ankiNoteId: fc.integer(),
  }
)
