import {
	type CardId,
	type NoteId,
	type Ord,
	type CardSettingId,
	type DeckId,
} from '../brand.js'
import { type Note } from './note'
import { type Template } from './template'

export const states = [
	'normal',
	'scheduler buried',
	'user buried',
	'suspended',
] as const
export type State = 'normal' | 'scheduler buried' | 'user buried' | 'suspended'
export type Score = 'again' | 'hard' | 'good' | 'easy'

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

export interface NoteCard {
	template: Template
	note: Note
	card: Card
}
