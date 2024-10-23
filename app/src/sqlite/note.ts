import { type NoteBase, type DB, type NoteFieldValue } from './database'
import {
	sql,
	type ExpressionBuilder,
	type OnConflictDatabase,
	type OnConflictTables,
	type InsertObject,
} from 'kysely'
import { chunk } from 'lodash-es'
import { C, ky, tx } from '../topLevelAwait'
import {
	noteEntityToDomain,
	updateLocalMediaIdByRemoteMediaIdAndGetNewDoc,
} from './util'
import { saveTags } from './tag'
import { type Note } from 'shared/domain/note'
import {
	type RemoteTemplateId,
	type RemoteNoteId,
	type NoteId,
	type MediaId,
	type RemoteMediaNum,
	type NookId,
} from 'shared/brand'
import { type CreateRemoteNote, type EditRemoteNote } from 'shared/schema'
import { notEmpty, objEntries, objKeys, objValues } from 'shared/utility'
import initSql from 'shared/sql.json'

function noteToDocType(note: Note) {
	const now = C.getDate().getTime()
	return [
		{
			id: note.id,
			templateId: note.templateId,
			created: now,
			edited: now,
			ankiNoteId: note.ankiNoteId,
		},
		Array.from(note.tags).map((tag) => ({ tag, noteId: note.id })),
		objEntries(note.fieldValues).map(([field, value]) => ({
			noteId: note.id,
			field,
			value,
		})),
	] satisfies [
		InsertObject<DB, 'noteBase'>,
		Array<InsertObject<DB, 'noteTag'>>,
		Array<InsertObject<DB, 'noteFieldValue'>>,
	]
}

function domainToCreateRemote(
	{ id, tags, fieldValues }: Note,
	remoteTemplateIds: RemoteTemplateId[],
): CreateRemoteNote {
	return {
		localId: id,
		remoteTemplateIds,
		fieldValues,
		tags: Array.from(tags),
	}
}

function domainToEditRemote(
	note: Note,
	remoteIds: Map<RemoteNoteId, RemoteTemplateId>,
) {
	const r: EditRemoteNote = {
		remoteIds,
		fieldValues: note.fieldValues,
		tags: Array.from(note.tags),
	}
	return r
}

// The point of this type is to cause an error if something is added to NoteBase
// If that happens, you probably want to update the `doUpdateSet` call.
// If not, you an add an exception to the Exclude below.
type OnConflictUpdateNoteSet = {
	[K in keyof NoteBase as Exclude<K, 'id' | 'created'>]: (
		x: ExpressionBuilder<
			OnConflictDatabase<DB, 'noteBase'>,
			OnConflictTables<'noteBase'>
		>,
	) => unknown
}

// The point of this type is to cause an error if something is added to NoteFieldValue
// If that happens, you probably want to update the `doUpdateSet` call.
// If not, you an add an exception to the Exclude below.
type OnConflictUpdateNoteValueSet = {
	[K in keyof NoteFieldValue as Exclude<K, 'noteId' | 'field'>]: (
		x: ExpressionBuilder<
			OnConflictDatabase<DB, 'noteFieldValue'>,
			OnConflictTables<'noteFieldValue'>
		>,
	) => unknown
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- interface doesn't work with `withTables`
type NoteFieldValueRowid = {
	// I'm not adding rowid to the official type definition because it adds noise to Insert/Update/Conflict resolution types
	noteFieldValue: NoteFieldValue & { rowid: number }
}

export const noteCollectionMethods = {
	upsertNote: async function (note: Note) {
		await this.bulkUpsertNotes([note])
	},
	bulkUpsertNotes: async function (notes: Note[]) {
		const batches = chunk(notes.map(noteToDocType), 1000)
		await tx(async (db) => {
			try {
				await sql`drop trigger noteFieldValue_after_insert`.execute(db)
				for (let i = 0; i < batches.length; i++) {
					C.toastInfo('note batch ' + i)
					const batch = batches[i]!
					const notes = batch.map((ct) => ct[0])
					const tags = batch.flatMap((ct) => ct[1])
					const fieldValues = batch.flatMap((ct) => ct[2])
					await db
						.insertInto('noteBase')
						.values(notes)
						.onConflict((db) =>
							db.doUpdateSet({
								edited: (x) => x.ref('excluded.edited'),
								templateId: (x) => x.ref('excluded.templateId'),
								ankiNoteId: (x) => x.ref('excluded.ankiNoteId'),
							} satisfies OnConflictUpdateNoteSet),
						)
						.execute()
					const noteIds = notes.map((c) => c.id)
					await saveTags(noteIds, tags)
					const fieldValuesJson = JSON.stringify(
						fieldValues.map((fv) => ({ [fv.noteId as string]: fv.field })),
					)
					await db
						.withTables<NoteFieldValueRowid>()
						.deleteFrom('noteFieldValue')
						.where(
							'rowid',
							'in',
							sql<number>`
(SELECT rowid
FROM (SELECT noteId, field FROM noteFieldValue where noteId in (${sql.join(
								noteIds,
							)})
      EXCEPT
      SELECT key AS noteId,
             value AS field
      FROM json_tree(${fieldValuesJson})
      WHERE TYPE = 'text'
     ) as x
JOIN noteFieldValue ON noteFieldValue.noteId = x.noteId AND noteFieldValue.field = x.field)`,
						)
						.execute()
					await db
						.insertInto('noteFieldValue')
						.values(fieldValues)
						.onConflict((x) =>
							x.doUpdateSet({
								value: (x) => x.ref('excluded.value'),
							} satisfies OnConflictUpdateNoteValueSet),
						)
						.execute()
					await db
						.insertInto('noteValueFts')
						.columns(['rowid', 'value', 'normalized'])
						.expression((eb) =>
							eb
								.selectFrom('noteFieldValue')
								.select([
									'rowid',
									'value',
									sql`ftsNormalize(value, 1, 1, 0)`.as('normalized'),
								])
								.where('noteId', 'in', noteIds),
						)
						.execute()
				}
				await sql`INSERT INTO noteFieldFts(noteFieldFts) VALUES('rebuild')`.execute(
					db,
				)
			} finally {
				const start = initSql.findIndex((x) =>
					x.includes('noteFieldValue_after_insert'),
				)
				const end = initSql.findIndex(
					(sql, i) => i > start && sql.includes('END'),
				)
				const trigger = initSql.slice(start, end + 1)
				await sql.raw(trigger.join('')).execute(db)
			}
		})
	},
	getNote: async function (noteId: NoteId) {
		const remoteNotes = await ky
			.selectFrom('remoteNote')
			.selectAll()
			.where('localId', '=', noteId)
			.execute()
		const note = await ky
			.selectFrom('note')
			.selectAll('note')
			.innerJoin('template', 'note.templateId', 'template.id')
			.select('template.fields as templateFields')
			.where('note.id', '=', noteId)
			.executeTakeFirst()
		return note == null ? null : noteEntityToDomain(note, remoteNotes)
	},
	getNotesByIds: async function (noteIds: NoteId[]) {
		const remoteNotes = await ky
			.selectFrom('remoteNote')
			.selectAll()
			.where('localId', 'in', noteIds)
			.execute()
		const notes = await ky
			.selectFrom('note')
			.selectAll('note')
			.innerJoin('template', 'note.templateId', 'template.id')
			.select('template.fields as templateFields')
			.where('note.id', 'in', noteIds)
			.execute()
		return notes.map((ln) =>
			noteEntityToDomain(
				ln,
				remoteNotes.filter((rn) => rn.localId === ln.id),
			),
		)
	},
	getNewNotesToUpload: async function () {
		const dp = new DOMParser()
		const remoteNotes = await ky
			.selectFrom('remoteNote')
			.selectAll()
			.where('remoteId', 'is', null)
			.execute()
		const localIds = [...new Set(remoteNotes.map((t) => t.localId))]
		const remoteTemplates = await ky
			.selectFrom('remoteTemplate')
			.selectAll()
			.execute()
		const notesAndStuff = await ky
			.selectFrom('note')
			.selectAll('note')
			.innerJoin('template', 'note.templateId', 'template.id')
			.select('template.fields as templateFields')
			.where('note.id', 'in', localIds)
			.execute()
			.then((n) =>
				n
					.map((noteEntity) => {
						const note = noteEntityToDomain(
							noteEntity,
							remoteNotes.filter((rn) => rn.localId === noteEntity.id),
						)
						const remotesEntries = objEntries(note.remotes)
						if (remotesEntries.length === 0)
							C.toastImpossible(
								'Zero remotes - is something wrong with the SQL query?',
							)
						const remoteIds = remotesEntries
							.map(([nook]) => {
								const rt =
									remoteTemplates.find(
										(rt) => rt.localId === note.templateId && nook === rt.nook,
									) ??
									C.toastImpossible(
										`No template found for id '${note.templateId}' with nook '${nook}'.`,
									)
								return rt.remoteId as RemoteTemplateId | null
							})
							.filter(notEmpty)
						return domainToCreateRemote(note, remoteIds)
					})
					.map((n) => withLocalMediaIdByRemoteMediaId(dp, n)),
			)
		return notesAndStuff.map((n) => n.note)
	},
	getEditedNotesToUpload: async function () {
		const dp = new DOMParser()
		const remoteNotes = await ky
			.selectFrom('remoteNote')
			.leftJoin('noteBase', 'remoteNote.localId', 'noteBase.id')
			.selectAll('remoteNote')
			.where('remoteId', 'is not', null)
			.whereRef('remoteNote.uploadDate', '<', 'noteBase.edited')
			.execute()
		const localIds = [...new Set(remoteNotes.map((t) => t.localId))]
		const remoteTemplates = await ky
			.selectFrom('remoteTemplate')
			.selectAll()
			.execute()
		const notesAndStuff = await ky
			.selectFrom('note')
			.selectAll('note')
			.innerJoin('template', 'note.templateId', 'template.id')
			.select('template.fields as templateFields')
			.where('note.id', 'in', localIds)
			.execute()
			.then((n) =>
				n
					.map((noteEntity) => {
						const note = noteEntityToDomain(
							noteEntity,
							remoteNotes.filter((rn) => rn.localId === noteEntity.id),
						)
						const remotesEntries = objEntries(note.remotes)
						if (remotesEntries.length === 0)
							C.toastImpossible(
								'Zero remotes - is something wrong with the SQL query?',
							)
						const remotes = new Map(
							remotesEntries.map(([nook, remote]) => {
								const rt =
									remoteTemplates.find(
										(rt) => rt.localId === note.templateId && nook === rt.nook,
									) ??
									C.toastImpossible(
										`No template found for id '${note.templateId}' with nook '${nook}'.`,
									)
								return [
									remote?.remoteNoteId ??
										C.toastImpossible(
											`remoteNoteId for ${JSON.stringify({
												nook,
												noteEntityId: noteEntity.id,
											})} is null.`,
										),
									rt.remoteId ??
										C.toastImpossible(
											`remoteId for ${JSON.stringify({
												nook,
												noteEntityId: noteEntity.id,
											})} is null.`,
										),
								]
							}),
						)
						return domainToEditRemote(note, remotes)
					})
					.map((n) => withLocalMediaIdByRemoteMediaId(dp, n)),
			)
		return notesAndStuff.map((n) => n.note)
	},
	getNoteMediaToUpload: async function () {
		const mediaBinaries = await ky
			.selectFrom('remoteMedia')
			.innerJoin('media', 'remoteMedia.localMediaId', 'media.id')
			.innerJoin('noteBase', 'remoteMedia.localEntityId', 'noteBase.id')
			.leftJoin('remoteNote', 'remoteNote.localId', 'noteBase.id')
			.select([
				'remoteMedia.localMediaId',
				'media.data',
				'remoteMedia.localEntityId',
				'remoteMedia.i',
				'remoteNote.remoteId',
			])
			.where(({ eb, ref, or }) =>
				or([
					eb('remoteMedia.uploadDate', 'is', null),
					eb('media.edited', '>', ref('remoteMedia.uploadDate')),
				]),
			)
			.execute()
		const media = new Map<
			MediaId,
			{ data: ArrayBuffer; ids: Array<[NoteId, RemoteNoteId, RemoteMediaNum]> }
		>(
			mediaBinaries.map(({ localMediaId, data }) => [
				localMediaId,
				{ data, ids: [] },
			]),
		)
		for (const m of mediaBinaries) {
			const remoteId =
				m.remoteId ??
				C.toastImpossible(
					`Note media '${m.localMediaId}' is missing a remoteId, is something wrong with the SQL query?`,
				)
			const value =
				media.get(m.localMediaId) ??
				C.toastImpossible(
					`mediaBinaries is missing '${m.localMediaId}'... how?`,
				)
			value.ids.push([m.localEntityId, remoteId, m.i])
		}
		return media
	},
	makeNoteUploadable: async function (noteId: NoteId, nook: NookId) {
		const remoteNote = {
			localId: noteId,
			nook,
			remoteId: null,
			uploadDate: null,
		}
		await tx(async (db) => {
			await db
				.insertInto('remoteNote')
				.values(remoteNote)
				.onConflict((db) => db.doNothing())
				.execute()
			const note = await db
				.selectFrom('note')
				.selectAll('note')
				.innerJoin('template', 'note.templateId', 'template.id')
				.select('template.fields as templateFields')
				.where('note.id', '=', noteId)
				.executeTakeFirstOrThrow()
			const { remoteMediaIdByLocal } = withLocalMediaIdByRemoteMediaId(
				new DOMParser(),
				domainToCreateRemote(noteEntityToDomain(note, [remoteNote]), [
					/* this doesn't need any real values... I think */
				]),
			)
			const srcs = new Set(remoteMediaIdByLocal.keys())
			const mediaBinaries = await db
				.selectFrom('media')
				.select(['id', 'data'])
				.where('id', 'in', Array.from(srcs))
				.execute()
			if (mediaBinaries.length !== srcs.size)
				C.toastFatal("You're missing a media.") // medTODO better error message
			await db
				.deleteFrom('remoteMedia')
				.where('localEntityId', '=', noteId)
				.where('i', '>', srcs.size as RemoteMediaNum)
				.execute()
			if (remoteMediaIdByLocal.size !== 0) {
				await db
					.insertInto('remoteMedia')
					.values(
						Array.from(remoteMediaIdByLocal).map(([localMediaId, i]) => ({
							localEntityId: noteId,
							i,
							localMediaId,
						})),
					)
					// insert into "remoteMedia" ("localEntityId", "i", "localMediaId") values (?, ?, ?)
					// on conflict do update set "localMediaId" = "excluded"."localMediaId"
					.onConflict((db) =>
						db.doUpdateSet({
							localMediaId: (x) => x.ref('excluded.localMediaId'),
						}),
					)
					.execute()
			}
		})
	},
	makeNoteNotUploadable: async function (noteId: NoteId, nook: NookId) {
		await tx(async (db) => {
			const r1 = await db
				.deleteFrom('remoteNote')
				.where('localId', '=', noteId)
				.where('nook', '=', nook)
				.returningAll()
				.execute()
			if (r1.length !== 1)
				C.toastWarn(
					`No remoteNote found for nook '${nook}' and noteId '${noteId}'`,
				)
			await db
				.deleteFrom('remoteMedia')
				.where('localEntityId', '=', noteId)
				.execute()
		})
	},
	updateNoteRemoteIds: async function (
		remoteIdByLocal: Map<readonly [NoteId, NookId], RemoteNoteId>,
	) {
		for (const [[noteId, nook], remoteId] of remoteIdByLocal) {
			const r = await ky
				.updateTable('remoteNote')
				.set({ remoteId, uploadDate: C.getDate().getTime() })
				.where('nook', '=', nook)
				.where('localId', '=', noteId)
				.returningAll()
				.execute()
			if (r.length !== 1)
				C.toastFatal(
					`No remoteNote found for nook '${nook}' and noteId '${noteId}'`,
				)
		}
	},
	markNoteAsPushed: async function (remoteNoteIds: RemoteNoteId[]) {
		const r = await ky
			.updateTable('remoteNote')
			.set({ uploadDate: C.getDate().getTime() })
			.where('remoteId', 'in', remoteNoteIds)
			.returningAll()
			.execute()
		if (r.length !== remoteNoteIds.length)
			C.toastFatal(
				`Some remoteNotes in ${JSON.stringify(
					remoteNoteIds,
				)} not found. (This is the worst error message ever - medTODO.)`,
			)
	},
}

function withLocalMediaIdByRemoteMediaId<
	T extends CreateRemoteNote | EditRemoteNote,
>(dp: DOMParser, note: T) {
	const fieldValues = new Map<string, string>()
	const { docs, remoteMediaIdByLocal } =
		updateLocalMediaIdByRemoteMediaIdAndGetNewDoc(
			dp,
			objValues(note.fieldValues),
		)
	let i = 0
	for (const field of objKeys(note.fieldValues)) {
		fieldValues.set(field, docs[i]!.body.innerHTML)
		i++
	}
	return {
		note: {
			...note,
			fieldValues,
		},
		remoteMediaIdByLocal,
	}
}
