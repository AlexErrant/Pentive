import type { CardId, NoteId, Ord, CardSettingId } from '../brand'
import type { Note } from './note'
import type { Template } from './template'

export const states = ['scheduler buried', 'user buried', 'suspended'] as const

export type State = (typeof states)[number]
export type Score = 'again' | 'hard' | 'good' | 'easy'

export interface Card {
	id: CardId
	ord: Ord
	noteId: NoteId
	tags: Set<string>
	created: Date
	edited: Date
	lapses: number
	repCount: number
	cardSettingId?: CardSettingId
	due: Date | number // `Date` is when the card is due. `number` is the ordinal when the card is "new".
	state?: State
}

export interface NoteCard {
	template: Template
	note: Note
	card: Card
}
