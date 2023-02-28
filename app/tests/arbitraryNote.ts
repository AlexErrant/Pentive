import fc, { Arbitrary } from "fast-check"
import { Note } from "../src/domain/note"
import { NoteId, RemoteCardId, RemoteTemplateId } from "../src/domain/ids"
import {
  arbitraryUlid,
  reasonableDates,
  recordWithOptionalFields,
} from "./arbitrary"

export const note = recordWithOptionalFields<Note>(
  {
    id: fc.uuidV(4).map((x) => x as NoteId),
    templateId: arbitraryUlid(),
    fieldValues: fc.dictionary(fc.string(), fc.string()),
    tags: fc.array(fc.string()).map((x) => new Set(x)),
    created: reasonableDates,
    modified: reasonableDates,
  },
  {
    remoteId: fc.uuidV(4).map((x) => x as RemoteCardId),
    pushTemplateId: fc.uuidV(4).map((x) => x as RemoteTemplateId),
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    push: fc.constant(true) as Arbitrary<true>,
    ankiNoteId: fc.integer(),
  }
)
