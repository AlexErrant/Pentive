import {
	type TemplateId,
	type NoteId,
	type RemoteNoteId,
	type RemoteTemplateId,
	type LDbId,
	type RemoteMediaId,
} from 'shared/brand'
import { C, ky } from '../topLevelAwait'

export const remoteMediaCollectionMethods = {
	updateUploadDate: async function (
		ids: Array<[NoteId | TemplateId, RemoteNoteId | RemoteTemplateId, RemoteMediaId]>,
	) {
		const uploadDate = C.getDate().getTime()
		for (const [localEntityId, , remoteMediaId] of ids) {
			const r = await ky
				.updateTable('remoteMedia')
				.set({ uploadDate })
				.where('localEntityId', '=', localEntityId as LDbId)
				.where('remoteMediaId', '=', remoteMediaId)
				.returningAll()
				.execute()
			if (r.length !== 1)
				C.toastFatal(
					`No remoteMedia found for localEntityId '${localEntityId}' with remoteId '${remoteMediaId}'.`,
				)
		}
	},
	getLocalMediaId: async function (remoteMediaId: RemoteMediaId) {
		return await ky
			.selectFrom('remoteMedia')
			.select('localMediaId')
			.where('remoteMediaId', '=', remoteMediaId)
			.executeTakeFirst()
	},
}
