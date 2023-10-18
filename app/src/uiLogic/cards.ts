import { type Card, type NoteCard, type Override, type Template } from 'shared'

export interface NoteCardView {
	template: Template
	note: Override<
		NoteCard['note'],
		{ fieldValues: Array<readonly [string, string]> }
	>
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
