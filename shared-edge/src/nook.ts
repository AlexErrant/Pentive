import { type NookId, type UserId } from 'shared/brand'
import { type NookType } from 'shared/domain/nook'
import { undefinedMap, throwExp, assertNever } from 'shared/utility'
import { db, epochToDate } from './kysely'

export async function getNook(nook: NookId) {
	const r = await db
		.selectFrom('nook')
		.select(['created', 'moderators'])
		.where('id', '=', nook)
		.executeTakeFirst()
	return undefinedMap(r, (nook) => ({
		created: epochToDate(nook.created),
		moderators: deserializeModerators(nook.moderators),
	}))
}

function validateNook(nook: NookId) {
	if (nook.length > 0) {
		// highTODO needs more checks
	} else {
		throwExp('bad nook name')
	}
}

function serializeNookType(nookType: NookType) {
	switch (nookType) {
		case 'public':
			return 0
		case 'restricted':
			return 1
		case 'private':
			return 2
		default:
			return assertNever(nookType)
	}
}

function deserializeNookType(i: number): NookType {
	switch (i) {
		case 0:
			return 'public' as const
		case 1:
			return 'restricted' as const
		case 2:
			return 'private' as const
		default:
			return throwExp(`Expected 0, 1, or 2, but got ${i}`)
	}
}

export async function getNooks() {
	const nooks = await db
		.selectFrom('nook')
		.select(['id', 'type', 'description'])
		.where('nook.type', '<>', 2)
		.execute()
	return nooks.map((n) => ({
		...n,
		type: deserializeNookType(n.type),
	}))
}

export async function createNook({
	nook,
	nookType,
	userId,
	description,
	sidebar,
}: {
	nook: NookId
	nookType: NookType
	userId: UserId
	description: string
	sidebar: string
}) {
	validateNook(nook)
	await db
		.insertInto('nook')
		.values({
			id: nook,
			moderators: serializeModerators(userId),
			description,
			sidebar,
			type: serializeNookType(nookType),
			approved: null,
		})
		.execute()
}

function deserializeModerators(moderators: string) {
	return JSON.parse(moderators) as string[]
}

function serializeModerators(userId: UserId) {
	return JSON.stringify([userId])
}
