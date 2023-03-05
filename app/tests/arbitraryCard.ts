import fc from "fast-check"
import { Card, Review, Score, states } from "../src/domain/card"

import { CardId, CardSettingId, Ord, DeckId, NoteId } from "../src/domain/ids"

import { reasonableDates, recordWithOptionalFields } from "./arbitrary"

export const review = recordWithOptionalFields<Review>(
  {
    score: fc.string().map((x) => x as Score), // this will generate "invalid" Scores, but I intend on this being extensible via plugins anyway, so might as well test every string
    created: reasonableDates,
    ease: fc.integer(),
    time: fc.integer(),
  },
  {
    newStep: fc.integer(),
    lapsed: fc.integer(),
    interval: fc.integer(),
  }
)

export const card = recordWithOptionalFields<Card>(
  {
    id: fc.uuidV(4).map((x) => x as CardId),
    noteId: fc.uuidV(4).map((x) => x as NoteId),
    deckIds: fc.array(fc.uuidV(4)).map((x) => new Set(x) as Set<DeckId>),
    created: reasonableDates,
    modified: reasonableDates,
    due: reasonableDates,
    ord: fc.integer().map((x) => x as Ord),
  },
  {
    cardSettingId: fc.uuidV(4).map((x) => x as CardSettingId),
    state: fc.constantFrom(...states),
  }
)
