import {
	type CardId,
	type NoteId,
	assertNever,
	undefinedMap,
	type Card,
	type State,
	type NoteCard,
	type TemplateId,
} from 'shared'
import { getDb, getKysely } from './crsqlite'
import { type DB, type Card as CardEntity, type Note } from './database'
import {
	type ExpressionBuilder,
	type OnConflictDatabase,
	type InsertObject,
	type Kysely,
	type OnConflictTables,
	sql,
	type SelectQueryBuilder,
} from 'kysely'
import _ from 'lodash'
import { entityToDomain as templateEntityToDomain } from './template'
import { entityToDomain as noteEntityToDomain } from './note'
import { toastImpossible, toastInfo } from '../components/toasts'
import { parseTags, stringifyTags } from './tag'
import { md5 } from '../domain/utility'
import { C } from '../pluginManager'

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
			return toastImpossible(`Expected null, 0, 1, 2, or 3, but got ${s}`)
	}
}

function cardToDocType(card: Card): InsertObject<DB, 'card'> {
	const { id, noteId, due, ord, tags, cardSettingId, state } = card
	const now = C.getDate().getTime()
	return {
		id,
		noteId,
		created: now,
		updated: now,
		due: due.getTime(),
		ord,
		tags: stringifyTags(tags),
		cardSettingId: cardSettingId ?? null,
		state: undefinedMap(state, serializeState) ?? null,
	}
}

function entityToDomain(card: CardEntity): Card {
	const r = {
		id: card.id as CardId,
		noteId: card.noteId as NoteId,
		created: new Date(card.created),
		updated: new Date(card.updated),
		due: new Date(card.due),
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

// https://stackoverflow.com/a/64489535
const groupByToMap = <T, Q>(
	array: T[],
	predicate: (value: T, index: number, array: T[]) => Q,
) =>
	array.reduce((map, value, index, array) => {
		const key = predicate(value, index, array)
		map.get(key)?.push(value) ?? map.set(key, [value])
		return map
	}, new Map<Q, T[]>())

// the point of this type is to cause an error if something is added to CardEntity
type OnConflictUpdateCardSet = {
	[K in keyof CardEntity as Exclude<K, 'id' | 'noteId' | 'created' | 'ord'>]: (
		x: ExpressionBuilder<
			OnConflictDatabase<DB, 'card'>,
			OnConflictTables<'card'>
		>,
	) => unknown
}

// This exists to lie to Typescript, saying that all caches are called `searchCache`.
// There are multiple caches with different names, but idk how to get that working with Kysely.
const searchCacheConst = 'searchCache' as const
type SearchCache = typeof searchCacheConst

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- interface deesn't work with `withTables`
type WithCache = {
	[searchCacheConst]: {
		rowid: number
		id: string
	}
	// I'm not adding rowid to the official type definition of Notes because it adds noise to Insert/Update/Conflict resolution types
	note: Note & { rowid: number }
	card: CardEntity & { rowid: number }
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
// 1. Loading all relevant ids like Anki. This makes initial load for large numbers of cards unacceptably slow on the web.
// 2. Deferred joins. https://planetscale.com/learn/courses/mysql-for-developers/examples/deferred-joins https://aaronfrancis.com/2022/efficient-pagination-using-deferred-joins
//    They're ~2x faster than a normal limit+offset if including a FTS search criteria, but that's still not fast enough. Maybe FTS doesn't count as a covering index.
async function buildCache(
	baseQuery: SelectQueryBuilder<DB, 'card' | 'note', Partial<unknown>>,
	search?: SearchParams,
) {
	const db = await getKysely()
	// const start = performance.now()
	const cacheName = ('getCardsCache_' +
		// lowTODO find a better way to name the cache table. Don't use crypto.subtle.digest - it's ~200ms which is absurd
		md5(JSON.stringify(search))) as SearchCache
	// const end = performance.now()
	// console.info(`hash built in ${end - start} ms`)
	const cacheExists = await db
		.selectFrom('sqlite_temp_master')
		.where('name', '=', cacheName)
		.select(db.fn.count<number>('name').as('c'))
		.executeTakeFirstOrThrow()
		.then((x) => x.c === 1)
	if (!cacheExists) {
		const db = getDb()
		const { sql, parameters } = baseQuery
			.clearSelect()
			.select('card.id as id')
			.compile()
		// console.log(
		// 	'PRAGMA temp_store',
		// 	(await sql`PRAGMA temp_store;`.execute(db)).rows[0],
		// )
		const start = performance.now()
		await (
			await db
		).exec(
			`CREATE TEMP TABLE IF NOT EXISTS ${cacheName} AS ` + sql,
			parameters as SQLiteCompatibleType[],
		)
		const end = performance.now()
		console.info(
			`Cache ${cacheName} for ${JSON.stringify(search)} built in ${
				end - start
			} ms`,
		)
	}
	return cacheName
}

export interface SearchParams {
	literalSearch?: string
	ftsSearch?: string
	tagSearch?: string[]
	templateSearch?: TemplateId[]
}

async function getCardsCount(
	searchCache: SearchCache | null,
	baseQuery: SelectQueryBuilder<
		DB & WithCache,
		'card' | 'note',
		Partial<unknown>
	>,
) {
	const db = (await getKysely()).withTables<WithCache>()
	const count =
		searchCache != null
			? db
					.selectFrom(searchCache)
					.select(db.fn.max(`${searchCache}.rowid`).as('c'))
					.executeTakeFirstOrThrow()
			: baseQuery
					.select(db.fn.countAll<number>().as('c'))
					.executeTakeFirstOrThrow()
	return await count
}

async function getCards(
	offset: number,
	limit: number,
	sort?: { col: 'card.due' | 'card.created'; direction: 'asc' | 'desc' },
	search?: SearchParams,
) {
	const db = (await getKysely()).withTables<WithCache>()
	const baseQuery = db
		.selectFrom('card')
		.innerJoin('note', 'card.noteId', 'note.id')
		.$if(sort != null, (db) => db.orderBy(sort!.col, sort!.direction))
		// don't `where` when scrolling - redundant since joining on the cache already filters
		.$if(offset === 0 && search?.ftsSearch != null, (db) =>
			db
				.innerJoin('noteFtsFv', 'noteFtsFv.rowid', 'note.rowid')
				.where('noteFtsFv.fieldValues', 'match', search!.ftsSearch!)
				.orderBy(sql`noteFtsFv.rank`),
		)
		// don't `where` when scrolling - redundant since joining on the cache already filters
		.$if(offset === 0 && search?.literalSearch != null, (db) =>
			db.where('note.fieldValues', 'like', '%' + search!.literalSearch + '%'),
		)
		// don't `where` when scrolling - redundant since joining on the cache already filters
		.$if(offset === 0 && search?.templateSearch != null, (db) =>
			db.where('note.templateId', 'in', search!.templateSearch!),
		)
		.$if(
			// don't `where` when scrolling - redundant since joining on the cache already filters
			offset === 0 && search?.tagSearch != null,
			(db) =>
				db
					.innerJoin('noteFtsTag', 'noteFtsTag.rowid', 'note.rowid')
					.innerJoin('cardFtsTag', 'cardFtsTag.rowid', 'card.rowid')
					.where((qb) =>
						// `or`ing `match` across multiple tables is annoying https://sqlite.org/forum/forumpost?udc=1&name=1a2f2ffdd80cf795
						qb.or([
							qb(
								'noteFtsTag.rowid',
								'in',
								qb
									.selectFrom('noteFtsTag')
									.select('rowid')
									.where(
										'noteFtsTag.tags',
										'match',
										search!
											// https://stackoverflow.com/a/46918640 https://blog.haroldadmin.com/posts/escape-fts-queries
											.tagSearch!.map((x) => `"${x.replaceAll('"', '""')}"`)
											.join(' OR '),
									),
							),
							qb(
								'cardFtsTag.rowid',
								'in',
								qb
									.selectFrom('cardFtsTag')
									.select('rowid')
									.where(
										'cardFtsTag.tags',
										'match',
										search!
											// https://stackoverflow.com/a/46918640 https://blog.haroldadmin.com/posts/escape-fts-queries
											.tagSearch!.map((x) => `"${x.replaceAll('"', '""')}"`)
											.join(' OR '),
									),
							),
						]),
					),
		)
	const searchCache =
		// If user has scrolled, build/use the cache.
		offset === 0 ? null : await buildCache(baseQuery, search)
	const entities = baseQuery
		.$if(searchCache != null, (qb) =>
			qb
				.innerJoin(searchCache!, 'card.id', `${searchCache!}.id`)
				.where(`${searchCache!}.rowid`, '>=', offset),
		)
		.innerJoin('template', 'template.id', 'note.templateId')
		.leftJoin('remoteNote', 'note.id', 'remoteNote.localId')
		.leftJoin('remoteTemplate', 'template.id', 'remoteTemplate.localId')
		.select([
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

			'remoteTemplate.nook as remoteTemplateNook',
			'remoteTemplate.remoteId as remoteTemplateId',
			'remoteTemplate.uploadDate as remoteTemplateUploadDate',

			'remoteNote.nook as remoteNoteNook',
			'remoteNote.remoteId as remoteNoteId',
			'remoteNote.uploadDate as remoteNoteUploadDate',
		])
		.limit(limit)
		.execute()
	const r = {
		searchCache,
		baseQuery,
		noteCards: Array.from(
			groupByToMap(await entities, (x) => x.card_id).values(),
		).map((tncR) => {
			const tnc = tncR[0]!
			const note = noteEntityToDomain(
				{
					ankiNoteId: tnc.note_ankiNoteId,
					created: tnc.note_created,
					fieldValues: tnc.note_fieldValues,
					id: tnc.note_id,
					updated: tnc.note_updated,
					tags: tnc.note_tags,
					templateId: tnc.note_templateId,
					templateFields: tnc.template_fields,
				},
				tncR
					.filter((x) => x.remoteNoteNook != null)
					.map((x) => ({
						remoteId: x.remoteNoteId!,
						nook: x.remoteNoteNook!,
						uploadDate: x.remoteNoteUploadDate,
						localId: x.note_id,
					})),
			)
			const template = templateEntityToDomain(
				{
					ankiId: tnc.template_ankiId,
					created: tnc.template_created,
					css: tnc.template_css,
					fields: tnc.template_fields,
					id: tnc.template_id,
					updated: tnc.template_updated,
					name: tnc.template_name,
					templateType: tnc.template_templateType,
				},
				tncR
					.filter((x) => x.remoteTemplateNook != null)
					.map((x) => ({
						remoteId: x.remoteTemplateId!,
						nook: x.remoteTemplateNook!,
						uploadDate: x.remoteTemplateUploadDate,
						localId: x.template_id,
					})),
			)
			const card = entityToDomain({
				cardSettingId: tnc.card_cardSettingId,
				created: tnc.card_created,
				tags: tnc.card_tags,
				due: tnc.card_due,
				id: tnc.card_id,
				updated: tnc.card_updated,
				noteId: tnc.card_noteId,
				ord: tnc.card_ord,
				state: tnc.card_state,
			})
			const r: NoteCard = { note, template, card }
			return r
		}),
	}
	return r
}

export const cardCollectionMethods = {
	upsertCard: async function (card: Card) {
		await this.bulkUpsertCards([card])
	},
	bulkUpsertCards: async function (cards: Card[], db?: Kysely<DB>) {
		db ??= await getKysely()
		const batches = _.chunk(cards.map(cardToDocType), 1000)
		for (let i = 0; i < batches.length; i++) {
			toastInfo('card batch ' + i)
			await db
				.insertInto('card')
				.values(batches[i]!)
				.onConflict((db) =>
					db.doUpdateSet({
						updated: (x) => x.ref('excluded.updated'),
						due: (x) => x.ref('excluded.due'),
						tags: (x) => x.ref('excluded.tags'),
						cardSettingId: (x) => x.ref('excluded.cardSettingId'),
						state: (x) => x.ref('excluded.state'),
					} satisfies OnConflictUpdateCardSet),
				)
				.execute()
		}
	},
	getCard: async function (cardId: CardId) {
		const db = await getKysely()
		const card = await db
			.selectFrom('card')
			.selectAll()
			.where('id', '=', cardId)
			.executeTakeFirst()
		return card == null ? null : entityToDomain(card)
	},
	getCardsByNote: async function (noteId: NoteId) {
		const db = await getKysely()
		const cards = await db
			.selectFrom('card')
			.selectAll()
			.where('noteId', '=', noteId)
			.execute()
		return cards.map(entityToDomain)
	},
	getCards,
	getCardsCount,
	buildCache,
}
