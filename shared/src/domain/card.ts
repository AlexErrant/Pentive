import {
  type CardId,
  type NoteId,
  type Ord,
  type CardSettingId,
  type DeckId,
} from "../brand.js"
import { type Note } from "./note"
import { type Template } from "./template"

export const states = [
  "normal",
  "scheduler buried",
  "user buried",
  "suspended",
] as const
export type State = "normal" | "scheduler buried" | "user buried" | "suspended"
export type Score = "again" | "hard" | "good" | "easy"

export interface Review {
  score: Score
  created: Date
  ease: number // factor
  time: number // milliseconds from seeing front to score

  // the following three are mutually exclusive
  newStep?: number // index - see card settings
  lapsed?: number // index - see card settings
  interval?: number // in seconds
}

export interface Card {
  id: CardId
  ord: Ord
  noteId: NoteId
  deckIds: Set<DeckId>
  created: Date
  updated: Date
  cardSettingId?: CardSettingId
  due: Date
  state?: State
}

export const sampleCard: Card = {
  id: "tZipXyNyRd63pgAAKcpnoQ" as CardId,
  noteId: "dZA8bN6wQMCfjwAAxwL72w" as NoteId,
  deckIds: new Set(),
  created: new Date(),
  updated: new Date(),
  due: new Date(),
  ord: 0 as Ord,
}

export interface NoteCard {
  template: Template
  note: Note
  card: Card
}
