import { Show, type VoidComponent } from 'solid-js'
import { type NookId, type RemoteTemplateId } from 'shared/brand'
import { type NoteCardView } from '../uiLogic/cards'
import { Entries } from '@solid-primitives/keyed'
import { type SetStoreFunction } from 'solid-js/store'

export const CardsRemote: VoidComponent<{
	readonly noteCard: NoteCardView
	readonly setNoteCard: SetStoreFunction<{
		noteCard?: NoteCardView
	}>
}> = (props) => (
	<Show when={Object.keys(props.noteCard.template.remotes).length !== 0}>
		Remote Nooks:
		<Entries of={props.noteCard.template.remotes}>
			{(nookId, remoteTemplate) => (
				<RemoteNook
					noteCard={props.noteCard}
					setNoteCard={props.setNoteCard}
					nookId={nookId}
					remoteTemplate={remoteTemplate()}
				/>
			)}
		</Entries>
	</Show>
)

const RemoteNook: VoidComponent<{
	readonly noteCard: NoteCardView
	readonly setNoteCard: SetStoreFunction<{
		noteCard?: NoteCardView
	}>
	readonly nookId: NookId
	readonly remoteTemplate:
		| {
				remoteTemplateId: RemoteTemplateId
				uploadDate: Date
		  }
		| null
		| undefined
}> = (props) => {
	const remote = () => props.noteCard.note.remotes[props.nookId] ?? null
	const uploadable = () =>
		props.noteCard.note.remotes[props.nookId] !== undefined
	return (
		<li class='px-4 py-2'>
			{uploadable() ? '✔' : ''}
			<Show when={remote() != null} fallback={props.nookId}>
				<a
					href={`${import.meta.env.VITE_HUB_ORIGIN}/n/${
						remote()!.remoteNoteId
					}`}
				>
					{props.nookId}
				</a>
			</Show>
			<input
				type='checkbox'
				checked={uploadable()}
				disabled={uploadable()} // medTODO not sure how to handle deletions yet...
				onChange={() => {
					if (!uploadable()) {
						props.setNoteCard('noteCard', 'note', 'remotes', props.nookId, null) // medTODO not sure how to handle deletions yet... F19F2731-BA29-406F-8F35-4E399CB40242
					}
				}}
			/>
		</li>
	)
}
