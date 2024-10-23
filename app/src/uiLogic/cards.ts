import { type Template } from 'shared/domain/template'
import { type NoteCard, type Card } from 'shared/domain/card'
import { type Note } from 'shared/domain/note'

export interface NoteCardView {
	template: Template
	note: Note
	mainCard?: Card
	cards: Card[]
}

export function toNoteCards(noteCardView: NoteCardView): NoteCard[] {
	return noteCardView.cards.map((card) => ({
		template: noteCardView.template,
		note: noteCardView.note,
		card,
	}))
}
