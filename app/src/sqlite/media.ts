import { undefinedMap } from 'shared'
import { type MediaId, type Media } from 'shared'
import * as Comlink from 'comlink'
import { getDb, getKysely } from './crsqlite'
import { type DB, type Media as MediaEntity } from './database'
import { type Transaction } from 'kysely'

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
	insertMediaTrx: async function (media: MediaSansHash, db: Transaction<DB>) {
		const hash = await crypto.subtle.digest('SHA-256', media.data)
		await db
			.insertInto('media')
			.values({
				id: media.id,
				created: media.created.getTime(),
				updated: media.updated.getTime(),
				data: new Uint8Array(media.data),
				hash: new Uint8Array(hash),
			})
			.execute()
	},
	insertMedia: async function (media: MediaSansHash) {
		const db = await getDb()
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
		const db = await getDb()
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
		const db = await getKysely()
		const media = await db
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
