import {
	type MediaId,
	type Base64Url,
	type RemoteMediaNum,
	csrfHeaderName,
} from 'shared'
import { db } from '../db'
import { C } from '../topLevelAwait'

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
