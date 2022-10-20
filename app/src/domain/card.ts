import {
  CardSettingId,
  DeckId,
  CardId,
  NoteId,
  ClozeIndex,
  ChildTemplateId,
} from "./ids"
import { Note } from "./note"
import { Template } from "./template"

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
  readonly pointer: ChildTemplateId | ClozeIndex
  readonly noteId: NoteId
  readonly deckIds: ReadonlySet<DeckId>
  readonly created: Date
  readonly modified: Date
  readonly cardSettingId?: CardSettingId
  readonly due: Date
  readonly state?: State
}

export const sampleCard: Card = {
  id: "B598A95F-2372-45DE-B7A6-29CA67A10D8E" as CardId,
  noteId: "305B7B2E-8591-4B4C-8775-3038E0AA34A4" as NoteId,
  deckIds: new Set(),
  created: new Date(),
  modified: new Date(),
  due: new Date(),
  pointer: "ED061BC3-B183-4C55-BE0D-0A820F491CE1" as ChildTemplateId,
}

export interface NoteCard {
  template?: Template
  note?: Note
  card: Card
}
