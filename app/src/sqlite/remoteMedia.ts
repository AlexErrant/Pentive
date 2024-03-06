import { type Base64Url, type LDbId, type RemoteMediaNum } from 'shared'
import { C, ky } from '../topLevelAwait'

export const remoteMediaCollectionMethods = {
	updateUploadDate: async function (
		ids: Array<[Base64Url, unknown, RemoteMediaNum]>,
	) {
		for (const [localEntityId, , i] of ids) {
			const r = await ky
				.updateTable('remoteMedia')
				.set({ uploadDate: C.getDate().getTime() })
				.where('localEntityId', '=', localEntityId as LDbId)
				.where('i', '=', i)
				.returningAll()
				.execute()
			if (r.length !== 1)
				C.toastFatal(
					`No remoteMedia found for localEntityId '${localEntityId}' with i ${i}.`,
				)
		}
	},
}
