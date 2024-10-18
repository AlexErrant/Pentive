import { undefinedMap } from 'shared/utility'
import { type Media } from 'shared/domain/media'
import * as Comlink from 'comlink'
import { ky, rd } from '../topLevelAwait'
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
		const db = rd
		const created = media.created.getTime()
		const edited = media.edited.getTime()
		const hash = await crypto.subtle.digest('SHA-256', media.data)
		await db.exec(
			`INSERT INTO media (id,created,edited,data,hash)
                  VALUES ( ?,      ?,      ?,   ?,   ?)`,
			[
				media.id,
				created,
				edited,
				new Uint8Array(media.data),
				new Uint8Array(hash),
			],
		)
	},
	async bulkInsertMedia(media: MediaSansHash[]) {
		// wa-sqlite write perf is significantly worse than Dexie's.
		// If moving to SQLite official doesn't improve perf, consider using Origin Private File System
		const db = rd
		await db.tx(async (tx) => {
			const insert = await tx.prepare(
				`INSERT INTO media (id,created,edited,data,hash)
                    VALUES ( ?,      ?,      ?,   ?,   ?)`,
			)
			for (const m of media) {
				const created = m.created.getTime()
				const edited = m.edited.getTime()
				const hash = await crypto.subtle.digest('SHA-256', m.data)
				await insert.run(
					tx,
					m.id,
					created,
					edited,
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
