import { Show, type JSX } from 'solid-js'
import { db } from '../db'
import Peers from './peers'
import {
	type MediaId,
	type Base64Url,
	type RemoteMediaNum,
	csrfHeaderName,
} from 'shared'
import { cwaClient } from '../trpcClient'
import { whoAmI } from '../globalState'

async function postMedia(
	type: 'note' | 'template',
	mediaId: MediaId,
	ids: Array<[Base64Url, Base64Url, RemoteMediaNum]>, // localId, remoteId, i
	data: ArrayBuffer,
): Promise<void> {
	const remoteEntityIdAndRemoteMediaNum = ids.map(
		([, remoteEntityId, remoteMediaNum]) => [
			remoteEntityId,
			remoteMediaNum.toString(),
		],
	)
	const response = await fetch(
		import.meta.env.VITE_CWA_URL +
			`media/${type}?` +
			new URLSearchParams(remoteEntityIdAndRemoteMediaNum).toString(),
		{
			method: 'POST',
			body: data,
			credentials: 'include',
			headers: new Headers({
				[csrfHeaderName]: '',
			}),
		},
	)
	// eslint-disable-next-line yoda
	if (200 <= response.status && response.status <= 299) {
		await db.updateUploadDate(ids)
	} else {
		console.error(
			`'${response.status}' HTTP status while uploading ${mediaId}.`,
		)
	}
	console.log(response)
}

async function uploadNotes(): Promise<void> {
	const newNotes = await db.getNewNotesToUpload()
	if (newNotes.length > 0) {
		const remoteIdByLocal = await cwaClient.createNote.mutate(newNotes)
		await db.updateNoteRemoteIds(remoteIdByLocal)
	}
	const editedNotes = await db.getEditedNotesToUpload()
	if (editedNotes.length > 0) {
		await cwaClient.editNote.mutate(editedNotes)
		await db.markNoteAsPushed(
			editedNotes.flatMap((n) => Array.from(n.remoteIds.keys())),
		)
	}
	const media = await db.getNoteMediaToUpload()
	for (const [mediaId, { data, ids }] of media) {
		await postMedia('note', mediaId, ids, data)
	}
	if (editedNotes.length === 0 && newNotes.length === 0 && media.size === 0) {
		console.log('Nothing to upload!')
	}
}

async function uploadTemplates(): Promise<void> {
	const newTemplates = await db.getNewTemplatesToUpload()
	if (newTemplates.length > 0) {
		const remoteIdByLocal = await cwaClient.createTemplates.mutate(newTemplates)
		await db.updateTemplateRemoteIds(remoteIdByLocal)
	}
	const editedTemplates = await db.getEditedTemplatesToUpload()
	if (editedTemplates.length > 0) {
		await cwaClient.editTemplates.mutate(editedTemplates)
		await db.markTemplateAsPushed(editedTemplates.flatMap((n) => n.remoteIds))
	}
	const media = await db.getTemplateMediaToUpload()
	for (const [mediaId, { data, ids }] of media) {
		await postMedia('template', mediaId, ids, data)
	}
	if (
		editedTemplates.length === 0 &&
		newTemplates.length === 0 &&
		media.size === 0
	) {
		console.log('Nothing to upload!')
	}
}

export default function Sync(): JSX.Element {
	return (
		<Show
			when={whoAmI()}
			fallback={"You can only upload/download/sync when you're logged in."}
		>
			<section class='text-gray-700 bg-gray-100 p-8'>
				<div class='mt-4'>
					<button
						class='border-gray-900 rounded-lg border px-2'
						onClick={async () => {
							await uploadTemplates()
						}}
					>
						upload Templates
					</button>
					<button
						class='border-gray-900 rounded-lg border px-2'
						onClick={async () => {
							await uploadNotes()
						}}
					>
						upload Notes
					</button>
					<button
						class='border-gray-900 rounded-lg border px-2'
						onClick={async () => {
							await db.sync()
						}}
					>
						sync
					</button>
				</div>
				<div class='mt-4'>
					<Peers />
				</div>
			</section>
		</Show>
	)
}
