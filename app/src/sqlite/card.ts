import {
	type DeckId,
	type CardId,
	type NoteId,
	assertNever,
	stringifySet,
	throwExp,
	undefinedMap,
	type Card,
	type State,
	type NoteCard,
} from 'shared'
import { getKysely } from './crsqlite'
import { type DB, type Card as CardEntity } from './database'
import {
	type ExpressionBuilder,
	type OnConflictDatabase,
	type InsertObject,
	type Kysely,
	type OnConflictTables,
	type RawBuilder,
	sql,
} from 'kysely'
import _ from 'lodash'
import { entityToDomain as templateEntityToDomain } from './template'
import { entityToDomain as noteEntityToDomain } from './note'

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
			return throwExp(`Expected null, 0, 1, 2, or 3, but got ${s}`)
	}
}

function cardToDocType(card: Card): InsertObject<DB, 'card'> {
	const { id, noteId, due, ord, deckIds, cardSettingId, state } = card
	const now = new Date().getTime()
	return {
		id,
		noteId,
		created: now,
		updated: now,
		due: due.getTime(),
		ord,
		deckIds: stringifySet(deckIds),
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
		deckIds: new Set(JSON.parse(card.deckIds) as DeckId[]),
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
	) => RawBuilder<CardEntity[K]>
}

export const cardCollectionMethods = {
	upsertCard: async function (card: Card) {
		await this.bulkUpsertCards([card])
	},
	bulkUpsertCards: async function (cards: Card[], db?: Kysely<DB>) {
		db ??= await getKysely()
		const batches = _.chunk(cards.map(cardToDocType), 1000)
		for (let i = 0; i < batches.length; i++) {
			console.log('card batch', i)
			await db
				.insertInto('card')
				.values(batches[i]!)
				.onConflict((db) =>
					db.doUpdateSet({
						updated: (x) => x.ref('excluded.updated'),
						due: (x) => x.ref('excluded.due'),
						deckIds: (x) => x.ref('excluded.deckIds'),
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
	getCards: async function (
		offset: number,
		limit: number,
		sort?: { col: 'due'; direction: 'asc' | 'desc' },
		search?: { literalSearch?: string; ftsSearch?: string },
	) {
		const db = await getKysely()
		const start = performance.now()
		const entities = await db
			.selectFrom('card')
			.innerJoin('note', 'card.noteId', 'note.id')
			.innerJoin('template', 'template.id', 'note.templateId')
			.leftJoin('remoteNote', 'note.id', 'remoteNote.localId')
			.leftJoin('remoteTemplate', 'template.id', 'remoteTemplate.localId')
			.select([
				'card.cardSettingId as card_cardSettingId',
				'card.created as card_created',
				'card.deckIds as card_deckIds',
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
			.offset(offset)
			.limit(limit)
			.$if(sort != null, (db) => db.orderBy(sort!.col, sort!.direction))
			.$if(search?.ftsSearch != null, (db) =>
				db
					.innerJoin('noteFts', 'noteFts.id', 'note.id')
					// must hardcode `noteFts` for now https://github.com/kysely-org/kysely/issues/546
					.where(sql`noteFts`, 'match', search!.ftsSearch)
					.orderBy(sql`rank`),
			)
			.$if(search?.literalSearch != null, (db) =>
				db.where('note.fieldValues', 'like', '%' + search!.literalSearch + '%'),
			)
			.execute()
		const end = performance.now()
		console.log(`Execution time: ${end - start} ms`, search)
		const count = await db
			.selectFrom('card')
			.innerJoin('note', 'card.noteId', 'note.id')
			.$if(search?.ftsSearch != null, (db) =>
				db
					.innerJoin('noteFts', 'noteFts.id', 'note.id')
					// must hardcode `noteFts` for now https://github.com/kysely-org/kysely/issues/546
					.where(sql`noteFts`, 'match', search!.ftsSearch),
			)
			.$if(search?.literalSearch != null, (db) =>
				db.where('note.fieldValues', 'like', '%' + search!.literalSearch + '%'),
			)
			.select(db.fn.count<number>('card.id').as('c'))
			.executeTakeFirstOrThrow()
		return {
			count: count.c,
			noteCards: Array.from(
				groupByToMap(entities, (x) => x.card_id).values(),
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
					deckIds: tnc.card_deckIds,
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
	},
}
