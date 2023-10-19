import { undefinedMap } from 'shared'
import { type MediaId, type Media } from 'shared'
import * as Comlink from 'comlink'
import { ky, rd } from '../topLevelAwait'
import { type Media as MediaEntity } from './database'

function entityToDomain(entity: MediaEntity): Media {
	return {
		id: entity.id,
		created: new Date(entity.created),
		updated: new Date(entity.updated),
		data: entity.data.buffer,
		hash: entity.hash.buffer,
	}
}

type MediaSansHash = Omit<Media, 'hash'>

export const mediaCollectionMethods = {
	insertMedia: async function (media: MediaSansHash) {
		const db = rd
		const created = media.created.getTime()
		const updated = media.updated.getTime()
		const hash = await crypto.subtle.digest('SHA-256', media.data)
		await db.exec(
			`INSERT INTO media (id,created,updated,data,hash)
                  VALUES ( ?,      ?,      ?,   ?,   ?)`,
			[
				media.id,
				created,
				updated,
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
				`INSERT INTO media (id,created,updated,data,hash)
                    VALUES ( ?,      ?,      ?,   ?,   ?)`,
			)
			for (const m of media) {
				const created = m.created.getTime()
				const updated = m.updated.getTime()
				const hash = await crypto.subtle.digest('SHA-256', m.data)
				await insert.run(
					tx,
					m.id,
					created,
					updated,
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
