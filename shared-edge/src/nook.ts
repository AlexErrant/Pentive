import {
	type NookId,
	throwExp,
	type UserId,
	undefinedMap,
	type NookType,
	assertNever,
} from 'shared'
import { db } from './kysely'

export async function getNook(nook: NookId) {
	const r = await db
		.selectFrom('nook')
		.select(['created', 'moderators'])
		.where('id', '=', nook)
		.executeTakeFirst()
	return undefinedMap(r, (nook) => ({
		...nook,
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
