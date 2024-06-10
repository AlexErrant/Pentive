import { jsonArrayFrom } from 'kysely/helpers/sqlite'
import {
	type CardId,
	type NoteId,
	assertNever,
	undefinedMap,
	type Card,
	type State,
	type NoteCard,
} from 'shared'
import { ky, C, rd } from '../topLevelAwait'
import {
	type DB,
	type Card as CardView,
	type CardBase,
	type Note,
	type CardSetting,
	type Template,
	type CardTag,
	type NoteFieldValue,
	type NoteTag,
} from './database'
import {
	type ExpressionBuilder,
	type OnConflictDatabase,
	type InsertObject,
	type OnConflictTables,
	sql,
	type SelectQueryBuilder,
	type QueryCreator,
} from 'kysely'
import _ from 'lodash'
import { md5 } from '../domain/utility'
import { noteEntityToDomain, parseTags, templateEntityToDomain } from './util'
import { type convert } from 'shared-dom'
import { type CardTagRowid, type NoteTagRowid } from './tag'

function serializeState(s: State): number {
	switch (s) {
		case 'normal':
			return 0
		case 'scheduler buried':
			return 1
		case 'user buried':
			return 2
		case 'suspended':
			return 3
		default:
			return assertNever(s)
	}
}

function deserializeState(s: number | null): State | undefined {
	switch (s) {
		case null:
			return undefined
		case 0:
			return 'normal'
		case 1:
			return 'scheduler buried'
		case 2:
			return 'user buried'
		case 3:
			return 'suspended'
		default:
			return C.toastImpossible(`Expected null, 0, 1, 2, or 3, but got ${s}`)
	}
}

function cardToDocType(
	card: Card,
): [InsertObject<DB, 'cardBase'>, Array<InsertObject<DB, 'cardTag'>>] {
	const { id, noteId, due, ord, tags, cardSettingId, state } = card
	const now = C.getDate().getTime()
	return [
		{
			id,
			noteId,
			created: now,
			updated: now,
			due: typeof due === 'number' ? due * -1 : due.getTime(),
			ord,
			cardSettingId: cardSettingId ?? null,
			state: undefinedMap(state, serializeState) ?? null,
		},
		Array.from(tags).map((tag) => ({ tag, cardId: id })),
	] satisfies [InsertObject<DB, 'cardBase'>, Array<InsertObject<DB, 'cardTag'>>]
}

function cardBaseToDomain(card: CardView): Card {
	const r = {
		id: card.id,
		noteId: card.noteId,
		created: new Date(card.created),
		updated: new Date(card.updated),
		due: card.due < 0 ? card.due * -1 : new Date(card.due),
		ord: card.ord,
		tags: parseTags(card.tags),
		state: deserializeState(card.state),
		cardSettingId: card.cardSettingId ?? undefined,
	}
	if (r.state === undefined) {
		delete r.state
	}
	if (r.cardSettingId === undefined) {
		delete r.cardSettingId
	}
	return r
}

// The point of this type is to cause an error if something is added to CardBase
// If that happens, you probably want to update the `doUpdateSet` call.
// If not, you an add an exception to the Exclude below.
type OnConflictUpdateCardSet = {
	[K in keyof CardBase as Exclude<K, 'id' | 'noteId' | 'created' | 'ord'>]: (
		x: ExpressionBuilder<
			OnConflictDatabase<DB, 'cardBase'>,
			OnConflictTables<'cardBase'>
		>,
	) => unknown
}

// This exists to lie to Typescript, saying that all fts join tables are called `joinFts`.
// There are multiple fts join tables with different names, but idk how to get that working with Kysely.
const joinFtsConst = 'joinFts' as const
type JoinFts = typeof joinFtsConst

// This exists to lie to Typescript, saying that all caches are called `searchCache`.
// There are multiple caches with different names, but idk how to get that working with Kysely.
const searchCacheConst = 'searchCache' as const
type SearchCache = typeof searchCacheConst

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- interface deesn't work with `withTables`
type WithCache = {
	[joinFtsConst]: Record<string, never>
	[searchCacheConst]: {
		rowid: number
		cardRowid: number
	}
	// I'm not adding rowid to the official type definition of Notes because it adds noise to Insert/Update/Conflict resolution types
	note: Note & { rowid: number }
	card: CardBase & { rowid: number }
	cardSetting: CardSetting & { rowid: number }
	template: Template & { rowid: number }
	noteFieldValue: NoteFieldValue & { rowid: number }
	noteTag: NoteTag & { rowid: number }
	cardTag: CardTag & { rowid: number }
	cardRowids: {
		cardRowid: number
		rank?: number
	}
}

// We cache the query's `card.id`s in a temp table. We use the temp table's rowids as a hack to get cursor pagination.
// We use `PRAGMA temp_store=MEMORY;` despite a lack of perf improvement because... well, there *should* be better perf.
// Doing 10 runs of alternating `FILE`/`MEMORY` showed no significant advantage to `MEMORY` (techncially a 2ms average improvement, which is just noise.)
// Grep 2790D3E0-F98B-4A95-8910-AC3E87F4F2D3
//
// medTODO Consider building the cache upon first OFFSET != 0, instead of after the initial load.
// medTODO Consider building the cache incrementally so its write doesn't block reads.
//
// Rejected ideas for improving limit+offset perf:
// 1. Loading all relevant ids. This makes initial load for large numbers of cards unacceptably slow on the web.
// 2. Deferred joins. https://planetscale.com/learn/courses/mysql-for-developers/examples/deferred-joins https://aaronfrancis.com/2022/efficient-pagination-using-deferred-joins
//    They're ~2x faster than a normal limit+offset if including a FTS search criteria, but that's still not fast enough. Maybe FTS doesn't count as a covering index.
async function buildCache(
	baseQuery: SelectQueryBuilder<DB, 'card' | 'note', Partial<unknown>>,
	query: string,
) {
	// const start = performance.now()
	const cacheName = ('getCardsCache_' +
		// lowTODO find a better way to name the cache table. Don't use crypto.subtle.digest - it's ~200ms which is absurd
		md5(query)) as SearchCache
	// const end = performance.now()
	// console.info(`hash built in ${end - start} ms`)
	const cacheExists = await ky
		.selectFrom('sqlite_temp_master')
		.where('name', '=', cacheName)
		.select(ky.fn.count<number>('name').as('c'))
		.executeTakeFirstOrThrow()
		.then((x) => x.c === 1)
	if (!cacheExists) {
		const { sql, parameters } = baseQuery.compile()
		// console.log(
		// 	'PRAGMA temp_store',
		// 	(await sql`PRAGMA temp_store;`.execute(db)).rows[0],
		// )
		const start = performance.now()
		await rd.exec(
			`CREATE TEMP TABLE IF NOT EXISTS ${cacheName} AS ` + sql,
			parameters as SQLiteCompatibleType[],
		)
		const end = performance.now()
		console.info(`Cache ${cacheName} for ${query} built in ${end - start} ms`)
	}
	return cacheName
}

async function getCardsCount(
	searchCache: SearchCache | null,
	baseQuery: (
		db1?: QueryCreator<DB & WithCache>,
	) => SelectQueryBuilder<DB, 'card' | 'note', Partial<unknown>>,
) {
	const db = ky.withTables<WithCache>()
	const count =
		searchCache != null
			? db
					.selectFrom(searchCache)
					.select(db.fn.max(`${searchCache}.rowid`).as('c'))
					.executeTakeFirstOrThrow()
			: db
					.with('cardRowids', baseQuery)
					.selectFrom('cardRowids')
					.select(db.fn.countAll<number>().as('c'))
					.executeTakeFirstOrThrow()
	return await count
}

async function getCards(
	offset: number,
	limit: number,
	query: string,
	conversionResult: ReturnType<typeof convert>,
	sort?: { col: 'card.due' | 'card.created'; direction: 'asc' | 'desc' },
) {
	const db = ky.withTables<WithCache>()
	const baseQuery = (
		db1: QueryCreator<DB & WithCache & CardTagRowid & NoteTagRowid> = db,
	) =>
		db1
			.selectFrom('card')
			.select('card.rowid as cardRowid')
			.innerJoin('note', 'card.noteId', 'note.id')
			.innerJoin('template', 'template.id', 'note.templateId')
			.$if(sort != null, (db) => db.orderBy(sort!.col, sort!.direction))
			// don't `where` when scrolling - redundant since joining on the cache already filters
			.$if(offset === 0 && conversionResult.sql != null, (db) =>
				db
					.$if(conversionResult.joinNoteValueFts.length !== 0, (dbSeed) => {
						let dbReturn = dbSeed
						conversionResult.joinNoteValueFts.forEach((t) => {
							const name = t.name as JoinFts
							const dbJoined = dbReturn.leftJoin(
								(eb) =>
									eb
										.selectFrom('noteValueFts')
										.innerJoin(
											'noteFieldValue',
											'noteFieldValue.rowid',
											'noteValueFts.rowid',
										)
										.select(['noteFieldValue.noteId as z', 'rank']) // `z` also goes here 2DB5DD73-603E-4DF7-A366-A53375AF0093
										.where(t.sql)
										.as(name),
								(join) => join.onRef(`${name}.z`, '=', 'note.id'),
							)
							dbReturn = dbJoined
						})
						const rankSum = conversionResult.joinNoteValueFts
							.map((t) => t.name + '.rank')
							.join('+')
						return dbReturn.select(sql.raw(rankSum).as('rank')).orderBy('rank')
					})
					.$if(conversionResult.joinNoteFieldValue.length !== 0, (dbSeed) => {
						let dbReturn = dbSeed
						conversionResult.joinNoteFieldValue.forEach((t) => {
							const name = t.name as JoinFts
							const dbJoined = dbReturn.leftJoin(
								(eb) =>
									eb
										.selectFrom('noteFieldValue')
										.select('noteFieldValue.noteId as z') // z to make typescript happy; otherwise `noteId` gets consoliated with `card.noteId` and made nullable
										.where(t.sql)
										.as(name),
								(join) => join.onRef(`${name}.z`, '=', 'note.id'),
							)
							dbReturn = dbJoined
						})
						return dbReturn
					})
					.$if(conversionResult.joinCardTagFts.length !== 0, (dbSeed) => {
						let dbReturn = dbSeed
						conversionResult.joinCardTagFts.forEach((t) => {
							const name = t.name as JoinFts
							const dbJoined = dbReturn.leftJoin(
								(eb) =>
									eb
										.selectFrom('cardTagFts')
										.innerJoin('cardTag', 'cardTag.tag', 'cardTagFts.tag')
										.select(['cardTag.tag', 'cardTag.cardId'])
										.where(t.sql)
										.as(name),
								(join) => join.onRef(`${name}.cardId`, '=', 'card.id'),
							)
							dbReturn = dbJoined
						})
						return dbReturn
					})
					.$if(conversionResult.joinNoteTagFts.length !== 0, (dbSeed) => {
						let dbReturn = dbSeed
						conversionResult.joinNoteTagFts.forEach((t) => {
							const name = t.name as JoinFts
							const dbJoined = dbReturn.leftJoin(
								(eb) =>
									eb
										.selectFrom('noteTagFts')
										.innerJoin('noteTag', 'noteTag.tag', 'noteTagFts.tag')
										.select(['noteTag.tag', 'noteTag.noteId as z']) // z to make typescript happy; otherwise `noteId` gets consoliated with `card.noteId` and made nullable
										.where(t.sql)
										.as(name),
								(join) => join.onRef(`${name}.z`, '=', 'note.id'),
							)
							dbReturn = dbJoined
						})
						return dbReturn
					})
					.$if(conversionResult.joinCardTag.length !== 0, (dbSeed) => {
						let dbReturn = dbSeed
						conversionResult.joinCardTag.forEach((t) => {
							const name = t.name as JoinFts
							const dbJoined = dbReturn.leftJoin(
								(eb) =>
									eb
										.selectFrom('cardTag')
										.select(['cardTag.tag', 'cardTag.cardId'])
										.where(t.sql)
										.as(name),
								(join) => join.onRef(`${name}.cardId`, '=', 'card.id'),
							)
							dbReturn = dbJoined
						})
						return dbReturn
					})
					.$if(conversionResult.joinNoteTag.length !== 0, (dbSeed) => {
						let dbReturn = dbSeed
						conversionResult.joinNoteTag.forEach((t) => {
							const name = t.name as JoinFts
							const dbJoined = dbReturn.leftJoin(
								(eb) =>
									eb
										.selectFrom('noteTag')
										.select(['noteTag.tag', 'noteTag.noteId as z']) // z to make typescript happy; otherwise `noteId` gets consoliated with `card.noteId` and made nullable
										.where(t.sql)
										.as(name),
								(join) => join.onRef(`${name}.z`, '=', 'note.id'),
							)
							dbReturn = dbJoined
						})
						return dbReturn
					})
					.$if(conversionResult.joinTemplateNameFts, (db) =>
						db.innerJoin(
							'templateNameFts',
							'templateNameFts.rowid',
							'template.rowid',
						),
					)
					.$if(conversionResult.joinCardSettingNameFts, (db) =>
						db
							.innerJoin('cardSetting', 'cardSetting.id', 'card.cardSettingId')
							.innerJoin(
								'cardSettingNameFts',
								'cardSettingNameFts.rowid',
								'cardSetting.rowid',
							),
					)
					.$if(conversionResult.joinLatestReview, (db) =>
						/* LEFT JOIN "review" AS "latestReview"
              ON  "latestReview"."cardId" = "card"."id"
              AND "latestReview"."created" = (
                SELECT MAX("created") AS "max"
                FROM   "review"
                WHERE  "card"."id" = "review"."cardId"
              ) */
						db.leftJoin('review as latestReview', (join) =>
							join
								.onRef('latestReview.cardId', '=', 'card.id')
								.on('latestReview.created', '=', (eb) =>
									eb
										.selectFrom('review')
										.select(eb.fn.max('created').as('max'))
										.whereRef('card.id', '=', 'review.cardId'),
								),
						),
					)
					.where(conversionResult.sql!),
			)
			.groupBy('card.rowid')
	const searchCache =
		// If user has scrolled, build/use the cache.
		offset === 0 ? null : await buildCache(baseQuery(), query)
	const table = searchCache ?? ('cardRowids' as const)
	const maybeCte: QueryCreator<DB & WithCache> =
		searchCache == null ? db.with('cardRowids', baseQuery) : db
	const entities = await maybeCte
		.selectFrom(table)
		.innerJoin('card', 'card.rowid', `${table}.cardRowid`)
		.innerJoin('note', 'card.noteId', 'note.id')
		.innerJoin('template', 'note.templateId', 'template.id')
		// Don't do left/right joins! `getCards` should return the `limit` number of cards, and left/right joins screw this up.
		.$if(searchCache != null, (qb) =>
			qb.where(`${searchCache!}.rowid`, '>=', offset),
		)
		.select((eb) => [
			'card.cardSettingId as card_cardSettingId',
			'card.created as card_created',
			'card.tags as card_tags',
			'card.due as card_due',
			'card.id as card_id',
			'card.updated as card_updated',
			'card.noteId as card_noteId',
			'card.ord as card_ord',
			'card.state as card_state',

			'note.ankiNoteId as note_ankiNoteId',
			'note.created as note_created',
			'note.fieldValues as note_fieldValues',
			'note.id as note_id',
			'note.updated as note_updated',
			'note.tags as note_tags',
			'note.templateId as note_templateId',

			'template.ankiId as template_ankiId',
			'template.created as template_created',
			'template.css as template_css',
			'template.fields as template_fields',
			'template.id as template_id',
			'template.updated as template_updated',
			'template.name as template_name',
			'template.templateType as template_templateType',

			jsonArrayFrom(
				eb
					.selectFrom('remoteTemplate')
					.select(['uploadDate', 'nook', 'remoteId'])
					.whereRef('note.templateId', '=', 'remoteTemplate.localId'),
			).as('remoteTemplate'),

			jsonArrayFrom(
				eb
					.selectFrom('remoteNote')
					.select(['uploadDate', 'nook', 'remoteId'])
					.whereRef('note.id', '=', 'remoteNote.localId'),
			).as('remoteNote'),
		])
		.limit(limit)
		.execute()
	const noteCards = entities.map((entity) => {
		const note = noteEntityToDomain(
			{
				ankiNoteId: entity.note_ankiNoteId,
				created: entity.note_created,
				fieldValues: entity.note_fieldValues,
				id: entity.note_id,
				updated: entity.note_updated,
				tags: entity.note_tags,
				templateId: entity.note_templateId,
				templateFields: entity.template_fields,
			},
			forceParse(entity.remoteNote).map((rn) => ({
				nook: rn.nook,
				localId: entity.note_id,
				remoteId: rn.remoteId,
				uploadDate: rn.uploadDate,
			})),
		)
		const template = templateEntityToDomain(
			{
				ankiId: entity.template_ankiId,
				created: entity.template_created,
				css: entity.template_css,
				fields: entity.template_fields,
				id: entity.template_id,
				updated: entity.template_updated,
				name: entity.template_name,
				templateType: entity.template_templateType,
			},
			forceParse(entity.remoteTemplate).map((rt) => ({
				nook: rt.nook,
				localId: entity.template_id,
				remoteId: rt.remoteId,
				uploadDate: rt.uploadDate,
			})),
		)
		const card = cardBaseToDomain({
			cardSettingId: entity.card_cardSettingId,
			created: entity.card_created,
			tags: entity.card_tags,
			due: entity.card_due,
			id: entity.card_id,
			updated: entity.card_updated,
			noteId: entity.card_noteId,
			ord: entity.card_ord,
			state: entity.card_state,
		})
		return { note, template, card } satisfies NoteCard
	})
	return {
		searchCache,
		baseQuery,
		noteCards,
		fieldValueHighlight: conversionResult.fieldValueHighlight,
	}
}

function forceParse<T>(x: T): T {
	return JSON.parse(x as string) as T // I don't want to use ParseJSONResultsPlugin because it parses all columns unconditionally. I parse manually instead.
}

export const cardCollectionMethods = {
	upsertCard: async function (card: Card) {
		await this.bulkUpsertCards([card])
	},
	bulkUpsertCards: async function (cards: Card[]) {
		// highTODO make this a transaction
		const batches = _.chunk(cards.map(cardToDocType), 1000)
		for (let i = 0; i < batches.length; i++) {
			C.toastInfo('card batch ' + i)
			const cardsTags = batches[i]!
			const cards = cardsTags.map((ct) => ct[0])
			const tags = cardsTags.flatMap((ct) => ct[1])
			await ky
				.insertInto('cardBase')
				.values(cards)
				.onConflict((db) =>
					db.doUpdateSet({
						updated: (x) => x.ref('excluded.updated'),
						due: (x) => x.ref('excluded.due'),
						cardSettingId: (x) => x.ref('excluded.cardSettingId'),
						state: (x) => x.ref('excluded.state'),
					} satisfies OnConflictUpdateCardSet),
				)
				.execute()
			const cardIds = sql.join(cards.map((c) => c.id as CardId))
			const cardsTagsJson = JSON.stringify(
				tags.map((t) => ({ [t.cardId as string]: t.tag })),
			)
			await ky
				.withTables<CardTagRowid>()
				.deleteFrom('cardTag')
				.where(
					'rowid',
					'in',
					sql<number>`
(SELECT rowid
FROM (SELECT cardId, tag FROM cardTag where cardId in (${cardIds})
      EXCEPT
      SELECT key AS cardId,
             value AS tag
      FROM json_tree(${cardsTagsJson})
      WHERE TYPE = 'text'
     ) as x
JOIN cardTag ON cardTag.cardId = x.cardId AND cardTag.tag = x.tag)`,
				)
				.execute()
			if (tags.length !== 0) {
				await ky
					.insertInto('cardTag')
					.values(tags)
					.onConflict((x) => x.doNothing())
					.execute()
			}
		}
	},
	getCard: async function (cardId: CardId) {
		const card = await ky
			.selectFrom('card')
			.selectAll()
			.where('id', '=', cardId)
			.executeTakeFirst()
		return card == null ? null : cardBaseToDomain(card)
	},
	getCardsByNote: async function (noteId: NoteId) {
		const cards = await ky
			.selectFrom('card')
			.selectAll()
			.where('noteId', '=', noteId)
			.execute()
		return cards.map(cardBaseToDomain)
	},
	getCards,
	getCardsCount,
	buildCache,
}
