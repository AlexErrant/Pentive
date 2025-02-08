import {
	type MediaId,
	type RemoteNoteId,
	type RemoteTemplateId,
	type RemoteMediaId,
	type TemplateId,
	type NookId,
	type NoteId,
} from 'shared/brand'
import { csrfHeaderName } from 'shared/headers'
import { C } from '../topLevelAwait'
import { cwaClient } from '../trpcClient'
import { type PostMediaQueryValue, type PostMediaQueryKey } from 'cwa/src/util'
import { throwExp } from 'shared/utility'

export async function postMedia(
	type: 'note' | 'template',
	mediaId: MediaId,
	ids: Array<
		[NoteId | TemplateId, RemoteNoteId | RemoteTemplateId, RemoteMediaId]
	>,
	data: ArrayBuffer,
) {
	const remoteEntityIdAndRemoteMediaId = ids.map(
		([, remoteEntityId, remoteMediaId]) =>
			[remoteEntityId, remoteMediaId] as const satisfies [
				PostMediaQueryKey,
				PostMediaQueryValue,
			],
	)
	const response = await fetch(
		import.meta.env.VITE_CWA_URL +
			`media/${type}?` +
			new URLSearchParams(remoteEntityIdAndRemoteMediaId).toString(),
		{
			method: 'POST',
			body: data,
			credentials: 'include',
			headers: new Headers({
				[csrfHeaderName]: '',
			}),
		},
	)

	if (200 <= response.status && response.status <= 299) {
		await C.db.updateUploadDate(ids)
	} else {
		const text = await response.text()
		C.toastError(
			<>
				<div>
					Error uploading <code>{mediaId}</code>:
				</div>
				<div>{text}</div>
			</>,
			response,
			text,
		)
		return mediaId
	}
}

// medTODO figure out a way to transactionally upload. Currently can upload templates with missing media
export async function uploadTemplates(
	torn: boolean,
	templateId?: TemplateId,
	nook?: NookId,
) {
	const newTemplates = await C.db.getNewTemplatesToUpload(templateId, nook)
	if (newTemplates.length > 0) {
		const remoteIdByLocal = await cwaClient.createTemplates.mutate(newTemplates)
		await C.db.updateRemotes('remoteTemplate', true, remoteIdByLocal)
	}
	const editedTemplates = await C.db.getEditedTemplatesToUpload(
		templateId,
		nook,
	)
	if (editedTemplates.length > 0) {
		const remoteIdByLocal =
			await cwaClient.editTemplates.mutate(editedTemplates)
		await C.db.updateRemotes('remoteTemplate', false, remoteIdByLocal)
	}
	const [media, failed] = await uploadTemplateMedia(torn, templateId)
	if (failed.length !== 0)
		throwExp('Failed uploading a Template media', {
			failedTemplateMediaIds: failed,
		})
	if (
		editedTemplates.length === 0 &&
		newTemplates.length === 0 &&
		media.size === 0
	) {
		C.toastInfo('Nothing to upload!')
	}
}

export async function uploadTemplateMedia(
	torn: boolean,
	templateId?: TemplateId,
) {
	const media = await C.db.getMediaToUpload('template', torn, templateId)
	const failed = []
	for (const [mediaId, { data, ids }] of media) {
		const f = await postMedia('template', mediaId, ids, data)
		if (f != null) failed.push(f)
	}
	return [media, failed] as const
}

export type SyncState = 'different' | 'uploaded' | 'uploading' | 'errored'

// medTODO figure out a way to transactionally upload. Currently can upload notes with missing media
export async function uploadNotes(
	torn: boolean,
	noteId?: NoteId,
	nook?: NookId,
) {
	const newNotes = await C.db.getNewNotesToUpload(noteId, nook)
	if (newNotes.length > 0) {
		const remoteIdByLocal = await cwaClient.createNote.mutate(newNotes)
		await C.db.updateRemotes('remoteNote', true, remoteIdByLocal)
	}
	const editedNotes = await C.db.getEditedNotesToUpload(noteId, nook)
	if (editedNotes.length > 0) {
		const remoteIdByLocal = await cwaClient.editNote.mutate(editedNotes)
		await C.db.updateRemotes('remoteNote', false, remoteIdByLocal)
	}
	const [media, failed] = await uploadNoteMedia(torn, noteId)
	if (failed.length !== 0)
		throwExp('Failed uploading a Note media', { failedNoteMediaIds: failed })
	if (editedNotes.length === 0 && newNotes.length === 0 && media.size === 0) {
		C.toastInfo('Nothing to upload!')
	}
}

export async function uploadNoteMedia(torn: boolean, noteId?: NoteId) {
	const media = await C.db.getMediaToUpload('note', torn, noteId)
	const failed = []
	for (const [mediaId, { data, ids }] of media) {
		const f = await postMedia('note', mediaId, ids, data)
		if (f != null) failed.push(f)
	}
	return [media, failed] as const
}
