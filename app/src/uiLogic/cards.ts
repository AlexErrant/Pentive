import { type Template } from 'shared/domain/template'
import { type NoteCard, type Card } from 'shared/domain/card'
import { type Override } from 'shared/utility'

export interface NoteCardView {
	template: Template
	note: Override<NoteCard['note'], { fieldValues: Array<[string, string]> }>
	mainCard?: Card
	cards: Card[]
}

export function toNoteCards(noteCardView: NoteCardView): NoteCard[] {
	return noteCardView.cards.map((card) => ({
		template: noteCardView.template,
		note: {
			...noteCardView.note,
			fieldValues: new Map(noteCardView.note.fieldValues),
		},
		card,
	}))
}
