import { type getNote } from 'shared-edge'
import { cwaClient } from '~/routes/cwaClient'
import { type NookId } from 'shared/brand'
import { type Component } from 'solid-js'
import { DownloadNote } from './downloadNote'

export type Note = NonNullable<Awaited<ReturnType<typeof getNote>>>

export const DownloadSubscribeNote: Component<{ note: Note; nook: NookId }> = (
	props,
) => {
	return (
		<>
			<DownloadNote note={props.note} nook={props.nook} />
			<button
				onClick={async () => {
					await cwaClient.subscribeToNote.mutate(props.note.id)
				}}
				disabled={props.note.til != null}
			>
				Subscribe
			</button>
		</>
	)
}
