import {
  CardSettingId,
  ChildTemplateId,
  ClozeIndex,
  DeckId,
  CardId,
  SpecimenRevisionId,
  TemplateId,
} from "./ids"

type State = "normal" | "scheduler buried" | "user buried" | "suspended"
type Score = "again" | "hard" | "good" | "easy"

interface Review {
  score: Score
  created: Date
  ease: number // factor
  time: number // milliseconds from seeing question to score

  // the following three are mutually exclusive
  newStep?: number // index - see card settings
  lapsed?: number // index - see card settings
  interval?: number // in seconds
}

export interface Card {
  type: "solo" | "parent" | "child"
  id: CardId
  deckIds: Set<DeckId>
  tags: Set<string>
  specimenRevisionId?: SpecimenRevisionId
  ankiNoteId?: number
  title?: string
  created: Date
  modified: Date
  cardSettingId?: CardSettingId
  due: Date
  lapsed?: boolean
  reviews: Review[]
  state?: State
}

export interface Base {
  templateId: TemplateId
  fieldValues: Map<string, string>
}

export interface SoloCard extends Card, Base {
  type: "solo"
}

// `parent` means it has children; `solo` means it doesn't. Prevents unnecessary DB lookups.
export interface ParentCard extends Card, Base {
  type: "parent"
}

export interface ChildCard extends Card {
  type: "child"
  parentId: CardId
  pointer: ChildTemplateId | ClozeIndex
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
  fieldValues: new Map(),
}
