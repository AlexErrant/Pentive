import type {
	TemplateId,
	NoteId,
	RemoteNoteId,
	RemoteTemplateId,
	LDbId,
	RemoteMediaId,
} from 'shared/brand'
import { C, ky } from '../topLevelAwait'

export const remoteMediaCollectionMethods = {
	async updateUploadDate(
		ids: Array<
			[NoteId | TemplateId, RemoteNoteId | RemoteTemplateId, RemoteMediaId]
		>,
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
	async getLocalMediaId(remoteMediaId: RemoteMediaId) {
		return await ky
			.selectFrom('remoteMedia')
			.select('localMediaId')
			.where('remoteMediaId', '=', remoteMediaId)
			.executeTakeFirst()
	},
}
