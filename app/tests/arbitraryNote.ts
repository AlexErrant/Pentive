import fc from "fast-check"
import { Note } from "../src/domain/note"
import { NoteId } from "../src/domain/ids"
import {
  arbitraryUlid,
  reasonableDates,
  recordWithOptionalFields,
} from "./arbitrary"
import { RemoteNoteId } from "shared"

export const note = recordWithOptionalFields<Note>(
  {
    id: fc.uuidV(4).map((x) => x as NoteId),
    templateId: arbitraryUlid(),
    fieldValues: fc.dictionary(fc.string(), fc.string()),
    tags: fc.array(fc.string()).map((x) => new Set(x)),
    created: reasonableDates,
    modified: reasonableDates,
    remotes: fc.dictionary(fc.string(), arbitraryUlid<RemoteNoteId>()),
  },
  {
    ankiNoteId: fc.integer(),
  }
)
