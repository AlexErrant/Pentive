import { CardSettingId, DeckId, CardId, NoteId, Ord } from "./ids"
import { Note } from "./note"
import { Template } from "./template"

export const states = [
  "normal",
  "scheduler buried",
  "user buried",
  "suspended",
] as const
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
  readonly ord: Ord
  readonly noteId: NoteId
  readonly deckIds: ReadonlySet<DeckId>
  readonly created: Date
  readonly modified: Date
  readonly cardSettingId?: CardSettingId
  readonly due: Date
  readonly state?: State
}

export const sampleCard: Card = {
  id: "tZipXyNyRd63pgAAKcpnoQ" as CardId,
  noteId: "dZA8bN6wQMCfjwAAxwL72w" as NoteId,
  deckIds: new Set(),
  created: new Date(),
  modified: new Date(),
  due: new Date(),
  ord: 0 as Ord,
}

export interface NoteCard {
  template: Template
  note: Note
  card: Card
}
