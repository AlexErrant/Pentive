import { CardSettingId, DeckId, CardId, NoteId } from "./ids"

export type State = "normal" | "scheduler buried" | "user buried" | "suspended"
export type Score = "again" | "hard" | "good" | "easy"

export interface Review {
  readonly score: Score
  readonly created: Date
  readonly ease: number // factor
  readonly time: number // milliseconds from seeing front to score

  // the following three are mutually exclusive
  readonly newStep?: number // index - see card settings
  readonly lapsed?: number // index - see card settings
  readonly interval?: number // in seconds
}

export interface Card {
  readonly id: CardId
  readonly noteId: NoteId
  readonly deckIds: ReadonlySet<DeckId>
  readonly tags: ReadonlySet<string>
  readonly created: Date
  readonly modified: Date
  readonly cardSettingId?: CardSettingId
  readonly due: Date
  readonly reviews: readonly Review[]
  readonly state?: State
}

export const sampleCard: Card = {
  id: "B598A95F-2372-45DE-B7A6-29CA67A10D8E" as CardId,
  noteId: "305B7B2E-8591-4B4C-8775-3038E0AA34A4" as NoteId,
  deckIds: new Set(),
  tags: new Set(),
  created: new Date(),
  modified: new Date(),
  due: new Date(),
  reviews: [],
}
