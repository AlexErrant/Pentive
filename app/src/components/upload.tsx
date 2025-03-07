import { Show } from 'solid-js'
import { C } from '../topLevelAwait'
import { createQuery } from '@tanstack/solid-query'

async function uploadCount() {
	const newTemplates = await C.db.getNewTemplatesToUpload()
	const editedTemplates = await C.db.getEditedTemplatesToUpload()
	const newNotes = await C.db.getNewNotesToUpload()
	const editedNotes = await C.db.getEditedNotesToUpload()
	return (
		newTemplates.length +
		editedTemplates.length +
		newNotes.length +
		editedNotes.length
	)
}

export default function Upload() {
	const count = createQuery(() => ({
		queryKey: ['uploadCount'],
		queryFn: uploadCount,
		initialData: 0,
	}))
	return (
		<div class='relative mx-4'>
			Sync
			<Show when={count.data > 0}>
				<div
					// https://stackoverflow.com/a/71440299
					class='border-black bg-lime-300 absolute flex items-center justify-center border px-1 font-normal'
					style={{
						bottom: '-1em',
						right: '-1.3em',
						'min-width': '1.6em',
						height: '1.6em',
						'border-radius': '0.8em',
						'z-index': 1000,
					}}
					role='status'
				>
					{count.data}
				</div>
			</Show>
		</div>
	)
}
