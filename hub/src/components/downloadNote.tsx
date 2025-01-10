import { type getNote } from 'shared-edge'
import { getAppMessenger } from '~/entry-client'
import { unwrap } from 'solid-js/store'
import { cwaClient } from 'app/trpcClient'
import { type Component } from 'solid-js'
import { type NookId } from 'shared/brand'

type Note = NonNullable<Awaited<ReturnType<typeof getNote>>>

export const DownloadNote: Component<{ note: Note; nook: NookId }> = (
	props,
) => {
	return (
		<button
			onClick={async () => {
				await getAppMessenger().addNote(unwrap(props.note), props.nook)
				await cwaClient.subscribeToNote.mutate(props.note.id)
			}}
			disabled={props.note.til != null}
		>
			Download
		</button>
	)
}

export default DownloadNote
