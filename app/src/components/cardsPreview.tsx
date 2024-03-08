import { For, Show, type VoidComponent } from 'solid-js'
import ResizingIframe from './resizingIframe'
import { type NoteCard } from 'shared'
import { toNoteCards, type NoteCardView } from '../uiLogic/cards'
import { C } from '../topLevelAwait'

function toMainNoteCards(noteCardView: NoteCardView): NoteCard {
	return {
		template: noteCardView.template,
		note: {
			...noteCardView.note,
			fieldValues: new Map(noteCardView.note.fieldValues),
		},
		card:
			noteCardView.mainCard ?? C.toastImpossible('No main card.', noteCardView),
	}
}

export const CardsPreview: VoidComponent<{
	readonly noteCard: NoteCardView
}> = (props) => {
	return (
		<Show
			when={props.noteCard.mainCard != null}
			fallback={
				<For each={toNoteCards(props.noteCard)}>
					{(noteCard) => <CardPreview noteCard={noteCard} />}
				</For>
			}
		>
			<CardPreview noteCard={toMainNoteCards(props.noteCard)} />
		</Show>
	)
}

function CardPreview(props: { noteCard: NoteCard }) {
	return (
		<>
			<ResizingIframe
				i={{
					tag: 'card',
					side: 'front',
					card: props.noteCard.card,
					note: props.noteCard.note,
					template: props.noteCard.template,
				}}
			/>
			<ResizingIframe
				i={{
					tag: 'card',
					side: 'back',
					card: props.noteCard.card,
					note: props.noteCard.note,
					template: props.noteCard.template,
				}}
			/>
		</>
	)
}
