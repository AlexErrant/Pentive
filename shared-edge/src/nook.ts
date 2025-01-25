import { type RemoteTemplateId, type NookId, type UserId } from 'shared/brand'
import { type NookType } from 'shared/domain/nook'
import {
	undefinedMap,
	throwExp,
	assertNever,
	type SqliteCount,
} from 'shared/utility'
import { db, epochToDate, fromBase64Url } from './kysely'
import { sql } from 'kysely'
import { TRPCError } from '@trpc/server'

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

interface FilterNooks {
	nooks: NookId[]
}
interface FilterTemplate {
	templateIds: RemoteTemplateId[]
}
export async function assertIsMod(
	filter: FilterTemplate | FilterNooks,
	userId: UserId,
) {
	let expectedLength
	const { c: modCount } = await db
		.selectFrom('nook')
		.select(db.fn.count<SqliteCount>('nook.id').as('c'))
		.where((qb) =>
			qb.exists(
				qb
					.selectFrom((eb) =>
						sql`json_each(${eb.ref('nook.moderators')})`.as('json_each'),
					)
					.select(sql`1`.as('_'))
					.where(sql`json_each.value`, '=', userId),
			),
		)
		.$if('nooks' in filter, (eb) => {
			const nooks = (filter as FilterNooks).nooks
			expectedLength = nooks.length
			return eb.where('nook.id', 'in', nooks)
		})
		.$if('templateIds' in filter, (eb) => {
			const templateIds = (filter as FilterTemplate).templateIds
			expectedLength = templateIds.length
			return eb
				.innerJoin('template', 'template.nook', 'nook.id')
				.where('template.id', 'in', templateIds.map(fromBase64Url))
		})
		.executeTakeFirstOrThrow()
	if (modCount !== expectedLength) {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
			message: "You're not a mod.",
		})
	}
}
