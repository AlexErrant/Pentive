import {
	For,
	type Setter,
	Show,
	type VoidComponent,
	createEffect,
	createSignal,
} from 'solid-js'
import {
	type NookId,
	type RemoteTemplateId,
	type RemoteNoteId,
	type NoteId,
} from 'shared/brand'
import { objEntries } from 'shared/utility'
import { db } from '../db'
import { type NoteCardView } from '../uiLogic/cards'

interface Remotes {
	readonly nookId: NookId
	readonly remoteTemplateId: {
		remoteTemplateId: RemoteTemplateId
		uploadDate: Date
	} | null
	readonly remote: {
		remoteNoteId: RemoteNoteId
		uploadDate: Date
	} | null
	readonly uploadable: boolean
}

function toggleNook(
	uploadable: boolean,
	noteId: NoteId,
	nook: NookId,
	setRemotes: Setter<Remotes[]>,
) {
	return (
		<input
			type='checkbox'
			class='form-checkbox'
			checked={uploadable}
			onChange={async () => {
				uploadable = !uploadable
				setRemotes((rs) =>
					rs.map((r) => (r.nookId === nook ? { ...r, uploadable } : r)),
				)
				uploadable
					? await db.makeNoteUploadable(noteId, nook)
					: await db.makeNoteNotUploadable(noteId, nook)
			}}
		/>
	)
}

export const CardsRemote: VoidComponent<{
	readonly noteCard: NoteCardView
}> = (props) => {
	const [getRemotes, setRemotes] = createSignal<Remotes[]>([])
	createEffect(() => {
		const remotes = objEntries(props.noteCard.template.remotes).map(
			([nookId, remoteTemplateId]) => {
				const remote = props.noteCard.note.remotes.get(nookId) ?? null
				const uploadable = props.noteCard.note.remotes.has(nookId)
				return {
					nookId,
					remoteTemplateId,
					remote,
					uploadable,
				} satisfies Remotes
			},
		)
		setRemotes(remotes)
	})
	return (
		<Show when={getRemotes().length !== 0}>
			Remote Nooks:
			<For each={getRemotes()}>
				{(x) => (
					<li class='px-4 py-2'>
						{x.uploadable ? '✔' : ''}
						<Show when={x.remote != null} fallback={x.nookId}>
							<a
								href={`${import.meta.env.VITE_HUB_ORIGIN}/n/${
									x.remote!.remoteNoteId
								}`}
							>
								{x.nookId}
							</a>
						</Show>
						{toggleNook(
							x.uploadable,
							props.noteCard.note.id,
							x.nookId,
							setRemotes,
						)}
					</li>
				)}
			</For>
		</Show>
	)
}
