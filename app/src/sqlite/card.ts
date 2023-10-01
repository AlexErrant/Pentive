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
import { toastImpossible, toastInfo, toastWarn } from '../components/toasts'
import { parseTags, stringifyTags } from './tag'

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
	const now = new Date().getTime()
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

// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
async function digestMessage(message: string) {
	const msgUint8 = new TextEncoder().encode(message) // encode as (utf-8) Uint8Array
	const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8) // hash the message
	const hashArray = Array.from(new Uint8Array(hashBuffer)) // convert buffer to byte array
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('') // convert bytes to hex string
	return hashHex
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
}

// We cache the query's `card.id`s in a temp table. We use the temp table's rowids as a hack to get cursor pagination.
async function buildCache(
	db: Kysely<DB & WithCache>,
	baseQuery: SelectQueryBuilder<DB, 'card' | 'note', Partial<unknown>>,
	search?: {
		literalSearch?: string
		ftsSearch?: string
	},
) {
	const cacheName = ('getCardsCache_' +
		// lowTODO find a better way to name the cache table
		(await digestMessage(JSON.stringify(search)))) as SearchCache
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
		await (
			await db
		).exec(
			`CREATE TEMP TABLE ${cacheName} AS ` + sql,
			parameters as SQLiteCompatibleType[],
		)
	}
	return cacheName
}

async function getCards(
	offset: number,
	limit: number,
	sort?: { col: 'card.due' | 'card.created'; direction: 'asc' | 'desc' },
	search?: {
		literalSearch?: string
		ftsSearch?: string
		tagSearch?: string[]
		templateSearch?: TemplateId[]
	},
): Promise<{ count: number; noteCards: NoteCard[] }> {
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
				.orderBy(sql`rank`),
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
				db.innerJoin('noteFtsTag', 'noteFtsTag.rowid', 'note.rowid').where(
					'noteFtsTag.tags',
					'match',
					search!
						// https://stackoverflow.com/a/46918640 https://blog.haroldadmin.com/posts/escape-fts-queries
						.tagSearch!.map((x) => `"${x.replaceAll('"', '""')}"`)
						.join(' OR '),
				),
		)
	const searchCache =
		// If user has scrolled, build/use the cache.
		offset === 0 ? null : await buildCache(db, baseQuery, search)
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
	const count =
		searchCache != null
			? db
					.selectFrom(searchCache)
					.select(db.fn.max(`${searchCache}.rowid`).as('c'))
					.executeTakeFirstOrThrow()
			: baseQuery
					.select(db.fn.countAll<number>().as('c'))
					.executeTakeFirstOrThrow()
	const r = {
		count: (await count).c,
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
	if (searchCache == null) {
		// asynchronously build the cache
		const start = performance.now()
		buildCache(db, baseQuery, search)
			.then((name) => {
				const end = performance.now()
				console.info(
					`Cache ${name} for ${JSON.stringify(search)} built in ${
						end - start
					} ms`,
				)
			})
			.catch((e) => {
				toastWarn('Error building cache', e)
			})
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
}
