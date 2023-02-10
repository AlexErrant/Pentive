import fc, { Arbitrary } from "fast-check"
import { Note } from "../src/domain/note"
import {
  NoteId,
  RemoteCardId,
  RemoteTemplateId,
  TemplateId,
} from "../src/domain/ids"
import { reasonableDates, recordWithOptionalFields } from "./arbitrary"
import { Ulid } from "id128"
import { base64url, hex } from "shared"

export const note = recordWithOptionalFields<Note>(
  {
    id: fc.uuidV(4).map((x) => x as NoteId),
    templateId: fc
      .date({
        min: new Date(1970, 0, 1),
        max: new Date(10889, 7, 2),
      })
      .map((time) => {
        const hexUlid = Ulid.generate({ time }).toRaw()
        const x = base64url.encode(hex.decode(hexUlid)).slice(0, 22)
        return x as TemplateId
      }),
    fieldValues: fc.dictionary(fc.string(), fc.string()),
    tags: fc.array(fc.string()).map((x) => new Set(x)),
    created: reasonableDates,
    modified: reasonableDates,
  },
  {
    pushId: fc.uuidV(4).map((x) => x as RemoteCardId),
    pushTemplateId: fc.uuidV(4).map((x) => x as RemoteTemplateId),
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    push: fc.constant(true) as Arbitrary<true>,
    ankiNoteId: fc.integer(),
    pushMedia: fc.dictionary(
      fc.nat({ max: 128 }).map((x) => x.toString()),
      fc.string()
    ),
  }
)
