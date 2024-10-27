import {
	type MediaId,
	type Base64Url,
	type RemoteMediaNum,
	type TemplateId,
	type NookId,
	type NoteId,
} from 'shared/brand'
import { csrfHeaderName } from 'shared/headers'
import { db } from '../db'
import { C } from '../topLevelAwait'
import { cwaClient } from '../trpcClient'

export async function postMedia(
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
		C.toastError(
			`'${response.status}' HTTP status while uploading media with id ${mediaId}.`,
		)
	}
}

export async function uploadTemplates(templateId?: TemplateId, nook?: NookId) {
	const media = await db.getTemplateMediaToUpload(templateId)
	for (const [mediaId, { data, ids }] of media) {
		await postMedia('template', mediaId, ids, data)
	}
	const newTemplates = await db.getNewTemplatesToUpload(templateId, nook)
	if (newTemplates.length > 0) {
		const remoteIdByLocal = await cwaClient.createTemplates.mutate(newTemplates)
		await db.updateTemplateRemoteIds(remoteIdByLocal)
	}
	const editedTemplates = await db.getEditedTemplatesToUpload(templateId, nook)
	if (editedTemplates.length > 0) {
		await cwaClient.editTemplates.mutate(editedTemplates)
		await db.markTemplateAsPushed(editedTemplates.flatMap((n) => n.remoteIds))
	}
	if (
		editedTemplates.length === 0 &&
		newTemplates.length === 0 &&
		media.size === 0
	) {
		C.toastInfo('Nothing to upload!')
	}
}

export type SyncState = 'different' | 'uploaded' | 'uploading' | 'errored'

export async function uploadNotes(
	noteId?: NoteId,
	nook?: NookId,
): Promise<void> {
	const media = await db.getNoteMediaToUpload(noteId)
	for (const [mediaId, { data, ids }] of media) {
		await postMedia('note', mediaId, ids, data)
	}
	const newNotes = await db.getNewNotesToUpload(noteId, nook)
	if (newNotes.length > 0) {
		const remoteIdByLocal = await cwaClient.createNote.mutate(newNotes)
		await db.updateNoteRemoteIds(remoteIdByLocal)
	}
	const editedNotes = await db.getEditedNotesToUpload(noteId, nook)
	if (editedNotes.length > 0) {
		await cwaClient.editNote.mutate(editedNotes)
		await db.markNoteAsPushed(
			editedNotes.flatMap((n) => Array.from(n.remoteIds.keys())),
		)
	}
	if (editedNotes.length === 0 && newNotes.length === 0 && media.size === 0) {
		C.toastInfo('Nothing to upload!')
	}
}
