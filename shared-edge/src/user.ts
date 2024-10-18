import { sql } from 'kysely'
import { db } from './kysely'
import { type UserId, type PeerJsId, type PeerDisplayName } from 'shared/brand'

// cSpell:ignore IFNULL
export async function setUserPeer(
	userId: UserId,
	peerId: PeerJsId,
	peerDisplayName: PeerDisplayName,
) {
	await db
		.updateTable('user')
		.set({
			peer: (x) =>
				sql`JSON_SET(${sql`IFNULL(${x.ref(
					'peer',
				)},'{}')`}, ${`$."${peerId}"`}, ${`${peerDisplayName}`})`,
		})
		.where('id', '=', userId)
		.execute()
}

export async function getUserPeer(userId: UserId) {
	const peer = await db
		.selectFrom('user')
		.select('peer')
		.where('user.id', '=', userId)
		.executeTakeFirst()
	return peer?.peer ?? null
}
