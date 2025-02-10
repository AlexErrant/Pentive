import { getAppMessenger } from '~/lib/clientOnly'
import { unwrap } from 'solid-js/store'
import type { Component } from 'solid-js'
import type { NookId } from 'shared/brand'
import { createAsync } from '@solidjs/router'
import { clientOnly } from '@solidjs/start'
import type { Note } from './downloadSubscribeNote'

export const DownloadNoteDefault: Component<{ note: Note; nook: NookId }> = (
	props,
) => {
	const hasRemoteNote = createAsync(
		async () => await (await getAppMessenger()).hasRemoteNote(props.note.id),
	)
	return (
		<button
			onClick={async () => {
				await (await getAppMessenger()).addNote(unwrap(props.note), props.nook)
			}}
			disabled={hasRemoteNote()}
		>
			Download
		</button>
	)
}

export default DownloadNoteDefault

export const DownloadNote = clientOnly(
	async () => await import('~/components/downloadNote'),
)
