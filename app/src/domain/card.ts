import {
  CardSettingId,
  ChildTemplateId,
  ClozeIndex,
  DeckId,
  CardId,
  SpecimenRevisionId,
  TemplateId,
} from "./ids"

export type State = "normal" | "scheduler buried" | "user buried" | "suspended"
export type Score = "again" | "hard" | "good" | "easy"

export interface Review {
  readonly score: Score
  readonly created: Date
  readonly ease: number // factor
  readonly time: number // milliseconds from seeing question to score

  // the following three are mutually exclusive
  readonly newStep?: number // index - see card settings
  readonly lapsed?: number // index - see card settings
  readonly interval?: number // in seconds
}

export interface Card {
  readonly type: "solo" | "parent" | "child"
  readonly id: CardId
  readonly deckIds: ReadonlySet<DeckId>
  readonly tags: ReadonlySet<string>
  readonly specimenRevisionId?: SpecimenRevisionId
  readonly ankiNoteId?: number
  readonly title?: string
  readonly created: Date
  readonly modified: Date
  readonly cardSettingId?: CardSettingId
  readonly due: Date
  readonly lapsed?: boolean
  readonly reviews: readonly Review[]
  readonly state?: State
}

export interface Base {
  readonly templateId: TemplateId

  // There's a 1:1 relationship between fields and values - order matters. It has this shape to make full text search/indexing easier
  readonly fields: readonly string[]
  readonly values: readonly string[]
}

export interface SoloCard extends Card, Base {
  readonly type: "solo"
}

// `parent` means it has children; `solo` means it doesn't. Prevents unnecessary DB lookups.
export interface ParentCard extends Card, Base {
  readonly type: "parent"
}

export interface ChildCard extends Card {
  readonly type: "child"
  readonly parentId: CardId
  readonly pointer: ChildTemplateId | ClozeIndex
}

export const sampleCard: SoloCard = {
  id: "B598A95F-2372-45DE-B7A6-29CA67A10D8E" as CardId,
  deckIds: new Set(),
  tags: new Set(),
  created: new Date(),
  modified: new Date(),
  due: new Date(),
  reviews: [],
  type: "solo",
  templateId: "EC2EFBBE-C944-478A-BFC4-023968B38A72" as TemplateId,
  fields: [],
  values: [],
}
