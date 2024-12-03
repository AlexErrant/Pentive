import { undefinedMap } from 'shared/utility'
import { type Media } from 'shared/domain/media'
import * as Comlink from 'comlink'
import { C, ky, rd } from '../topLevelAwait'
import { type Media as MediaEntity } from './database'
import { type MediaId } from 'shared/brand'

function entityToDomain(entity: MediaEntity): Media {
	return {
		id: entity.id,
		created: new Date(entity.created),
		edited: new Date(entity.edited),
		data: entity.data.buffer,
		hash: entity.hash.buffer,
	}
}

type MediaSansHash = Omit<Media, 'hash'>

export const mediaCollectionMethods = {
	insertMedia: async function (media: MediaSansHash) {
		const now = C.getDate().getTime()
		const hash = await crypto.subtle.digest('SHA-256', media.data)
		await rd.exec(
			`INSERT INTO media (id,created,edited,data,hash)
                  VALUES ( ?,      ?,      ?,  ?,   ?)`,
			// lowTODO add conflict types via typescript, i.e. "point of this type is to cause an error if something is added to Media"
			[media.id, now, now, new Uint8Array(media.data), new Uint8Array(hash)],
		)
	},
	async bulkInsertMedia(media: MediaSansHash[]) {
		const now = C.getDate().getTime()
		// wa-sqlite write perf is significantly worse than Dexie's.
		// If moving to SQLite official doesn't improve perf, consider using Origin Private File System
		await rd.tx(async (tx) => {
			const insert = await tx.prepare(
				`INSERT INTO media (id,created,edited,data,hash)
                    VALUES ( ?,      ?,      ?,  ?,   ?)`,
			)
			// lowTODO add conflict types via typescript, i.e. "point of this type is to cause an error if something is added to Media"
			for (const m of media) {
				const hash = await crypto.subtle.digest('SHA-256', m.data)
				await insert.run(
					tx,
					m.id,
					now,
					now,
					new Uint8Array(m.data),
					new Uint8Array(hash),
				)
			}
			await insert.finalize(tx)
		})
	},
	async getMedia(id: MediaId) {
		// This helps detect memory leaks - if you see this log 100x, something's very wrong.
		console.debug('getMedia for ' + id)
		const media = await ky
			.selectFrom('media')
			.selectAll()
			.where('id', '=', id)
			.executeTakeFirst()
			.then((r) => undefinedMap(r, entityToDomain))
		if (media?.data == null) {
			return undefined
		} else {
			return Comlink.transfer(media, [media.data, media.hash])
		}
	},
}
