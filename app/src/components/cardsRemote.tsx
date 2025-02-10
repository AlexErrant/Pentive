import { Show, type VoidComponent } from 'solid-js'
import type { NookId } from 'shared/brand'
import type { NoteCardView } from '../uiLogic/cards'
import { Entries } from '@solid-primitives/keyed'
import type { SetStoreFunction } from 'solid-js/store'
import type { TemplateRemote } from 'shared/domain/template'
import { ExternalLink } from 'shared-dom/icons'

export const CardsRemote: VoidComponent<{
	readonly noteCard: NoteCardView
	readonly setNoteCard: SetStoreFunction<{
		noteCard?: NoteCardView
	}>
}> = (props) => (
	<Show when={Object.keys(props.noteCard.template.remotes).length !== 0}>
		<fieldset class='border-black border p-2'>
			<legend>
				<span class='p-2 px-4 font-bold'>Remote Nooks</span>
			</legend>
			<ul>
				<Entries of={props.noteCard.template.remotes}>
					{(nookId, templateRemote) => (
						<RemoteNook
							noteCard={props.noteCard}
							setNoteCard={props.setNoteCard}
							nookId={nookId}
							templateRemote={templateRemote()}
						/>
					)}
				</Entries>
			</ul>
		</fieldset>
	</Show>
)

const RemoteNook: VoidComponent<{
	readonly noteCard: NoteCardView
	readonly setNoteCard: SetStoreFunction<{
		noteCard?: NoteCardView
	}>
	readonly nookId: NookId
	readonly templateRemote: TemplateRemote
}> = (props) => {
	const remote = () => props.noteCard.note.remotes[props.nookId] ?? null
	const uploadable = () =>
		props.noteCard.note.remotes[props.nookId] !== undefined
	return (
		<li>
			<label>
				<input
					type='checkbox'
					checked={uploadable()}
					disabled={uploadable()} // medTODO not sure how to handle deletions yet...
					onChange={() => {
						if (!uploadable()) {
							props.setNoteCard(
								'noteCard',
								'note',
								'remotes',
								props.nookId,
								null,
							) // medTODO not sure how to handle deletions yet... F19F2731-BA29-406F-8F35-4E399CB40242
						}
					}}
				/>
				/n/{props.nookId}
			</label>
			<Show when={remote() != null}>
				<a
					target='_blank'
					href={`${import.meta.env.VITE_HUB_ORIGIN}/n/${props.nookId}/note/${
						remote()!.remoteNoteId
					}`}
				>
					<ExternalLink class='inline h-5' />
				</a>
			</Show>
		</li>
	)
}
