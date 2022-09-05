import fc, { Arbitrary } from "fast-check"
import {
  ChildCard,
  ParentCard,
  Review,
  Score,
  SoloCard,
  State,
} from "../src/domain/card"

import {
  CardId,
  CardSettingId,
  ChildTemplateId,
  ClozeIndex,
  DeckId,
  RemoteCardId,
  RemoteTemplateId,
  TemplateId,
} from "../src/domain/ids"

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

const required = {
  id: fc.uuidV(4).map((x) => x as CardId),
  deckIds: fc.array(fc.uuidV(4)).map((x) => new Set(x) as Set<DeckId>),
  tags: fc.array(fc.string()).map((x) => new Set(x)),
  created: reasonableDates,
  modified: reasonableDates,
  due: reasonableDates,
  reviews: fc.array(review),
}

const optional = {
  pushId: fc.uuidV(4).map((x) => x as RemoteCardId),
  pushTemplateId: fc.uuidV(4).map((x) => x as RemoteTemplateId),
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  push: fc.constant(true) as Arbitrary<true>,
  ankiNoteId: fc.integer(),
  title: fc.string(),
  cardSettingId: fc.uuidV(4).map((x) => x as CardSettingId),
  lapsed: fc.boolean(),
  state: fc.string().map((x) => x as State), // this will generate "invalid" States, but I intend on this being extensible via plugins anyway, so might as well test every string
}

const base = {
  templateId: fc.uuidV(4).map((x) => x as TemplateId),
  fields: fc.array(fc.string()),
  values: fc.array(fc.string()),
}

export const soloCard = recordWithOptionalFields<SoloCard>(
  {
    ...required,
    ...base,
    type: fc.constant("solo"),
  },
  optional
)

export const parentCard = recordWithOptionalFields<ParentCard>(
  {
    ...required,
    ...base,
    type: fc.constant("parent"),
  },
  optional
)

export const childCard = recordWithOptionalFields<ChildCard>(
  {
    ...required,
    type: fc.constant("child"),
    parentId: fc.uuidV(4).map((x) => x as CardId),
    pointer: fc.oneof(
      fc.string().map((x) => x as ChildTemplateId),
      fc.integer().map((x) => x as ClozeIndex)
    ),
  },
  optional
)

export const card = fc.oneof(soloCard, parentCard, childCard)
