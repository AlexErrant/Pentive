import type { RemoteNote, NoteBase, DB, NoteFieldValue } from './database'
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
	getTemplate,
	noteEntityToDomain,
	templateSelection,
	remotifyDoms,
	getMediaToUpload,
} from './util'
import { saveTags } from './tag'
import type { Note } from 'shared/domain/note'
import {
	type RemoteTemplateId,
	type RemoteNoteId,
	type NoteId,
	type NookId,
	toLDbId,
	fromLDbId,
} from 'shared/brand'
import type { CreateRemoteNote, EditRemoteNote } from 'shared/schema'
import {
	notEmpty,
	objEntries,
	objKeys,
	objValues,
	type SqliteCount,
	type Override,
} from 'shared/utility'
import initSql from 'shared/sql.json'

function noteToDocType(note: Note) {
	const now = C.getDate().getTime()
	return [
		{
			id: toLDbId(note.id),
			templateId: toLDbId(note.templateId),
			created: now,
			edited: now,
			ankiNoteId: note.ankiNoteId,
		},
		Array.from(note.tags).map((tag) => ({ tag, noteId: toLDbId(note.id) })),
		objEntries(note.fieldValues).map(([field, value]) => ({
			noteId: note.id,
			field,
			value,
		})),
		objEntries(note.remotes).map(([nook, remote]) => ({
			note,
			localId: toLDbId(note.id),
			nook,
			remoteId: toLDbId(remote?.remoteNoteId),
			uploadDate: remote?.uploadDate.getTime(),
		})),
	] satisfies [
		InsertObject<DB, 'noteBase'>,
		Array<InsertObject<DB, 'noteTag'>>,
		Array<InsertObject<DB, 'noteFieldValue'>>,
		Array<InsertObject<DB, 'remoteNote'> & { note: Note }>,
	]
}

function domainToCreateRemote(
	{ id, tags, fieldValues }: Note,
	remoteTemplateIds: RemoteTemplateId[],
) {
	return {
		localId: id,
		remoteTemplateIds,
		fieldValues,
		tags: Array.from(tags),
	} satisfies CreateRemoteNote
}

function domainToEditRemote(
	note: Note,
	remoteIds: Map<RemoteNoteId, RemoteTemplateId>,
) {
	return {
		localId: note.id,
		remoteIds,
		fieldValues: note.fieldValues,
		tags: Array.from(note.tags),
	} satisfies EditRemoteNote
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
	async upsertNote(note: Note) {
		await this.bulkUpsertNotes([note])
	},
	async bulkUpsertNotes(notes: Note[]) {
		const batches = chunk(notes.map(noteToDocType), 1000)
		await tx(async (db) => {
			try {
				await sql`drop trigger noteFieldValue_after_insert`.execute(db)
				for (let i = 0; i < batches.length; i++) {
					C.toastInfo(`note batch ${i}`)
					const batch = batches[i]!
					const notes = batch.map((ct) => ct[0])
					const tags = batch.flatMap((ct) => ct[1])
					const fieldValues = batch.flatMap((ct) => ct[2])
					const remotes = batch.flatMap((ct) => ct[3])
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
					if (fieldValues.length > 0) {
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
					for (const r of remotes) {
						await this.makeNoteUploadable(r) // doesn't handle deletions! F19F2731-BA29-406F-8F35-4E399CB40242
					}
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
	async getNote(noteId: NoteId) {
		const noteDbId = toLDbId(noteId)
		const remoteNotes = await ky
			.selectFrom('remoteNote')
			.selectAll()
			.where('localId', '=', noteDbId)
			.execute()
		const note = await ky
			.selectFrom('note')
			.selectAll('note')
			.innerJoin('template', 'note.templateId', 'template.id')
			.select('template.fields as template_fields')
			.where('note.id', '=', noteDbId)
			.executeTakeFirst()
		return note == null ? null : noteEntityToDomain(note, remoteNotes)
	},
	async getNotesByIds(noteIds: NoteId[]) {
		const noteDbIds = noteIds.map(toLDbId)
		const remoteNotes = await ky
			.selectFrom('remoteNote')
			.selectAll()
			.where('localId', 'in', noteDbIds)
			.execute()
		const notes = await ky
			.selectFrom('note')
			.selectAll('note')
			.innerJoin('template', 'note.templateId', 'template.id')
			.select('template.fields as template_fields')
			.where('note.id', 'in', noteDbIds)
			.execute()
		return notes.map((ln) =>
			noteEntityToDomain(
				ln,
				remoteNotes.filter((rn) => rn.localId === ln.id),
			),
		)
	},
	async getNewNotesToUpload(noteId?: NoteId, nook?: NookId) {
		const remoteTemplates = await ky
			.selectFrom('remoteTemplate')
			.selectAll()
			.execute()
		const notesAndStuff = await this.getNewNotesToUploadDom(noteId)
		return await Promise.all(
			notesAndStuff
				.map(([, note]) => {
					const remoteIds = objKeys(note.remotes)
						.map((remoteNook) => {
							if (nook != null && remoteNook !== nook) return null
							const rt =
								remoteTemplates.find(
									(rt) =>
										rt.localId === note.templateId && remoteNook === rt.nook,
								) ??
								C.toastImpossible(
									`No template found for id '${note.templateId}' with nook '${remoteNook}'.`,
								)
							return fromLDbId<RemoteTemplateId | null>(rt.remoteId)
						})
						.filter(notEmpty)
					return domainToCreateRemote(note, remoteIds)
				})
				.map(async (n) => await remotifyNote(n).then((x) => x.note)),
		)
	},
	async getNewNotesToUploadDom(noteId?: NoteId) {
		const remoteNotes = await ky
			.selectFrom('remoteNote')
			.selectAll()
			.where('remoteId', 'is', null)
			.execute()
		const localIds = [...new Set(remoteNotes.map((t) => t.localId))]
		return await ky
			.selectFrom('note')
			.selectAll('note')
			.innerJoin('template', 'note.templateId', 'template.id')
			.select(templateSelection)
			.where('note.id', 'in', localIds)
			.$if(noteId != null, (db) => db.where('note.id', '=', toLDbId(noteId!)))
			.execute()
			.then((n) =>
				n.map((entity) => {
					const note = noteEntityToDomain(
						entity,
						remoteNotes.filter((rn) => rn.localId === entity.id),
					)
					if (objKeys(note.remotes).length === 0)
						C.toastImpossible(
							'Zero remotes - is something wrong with the SQL query?',
						)
					return [getTemplate(entity), note] as const
				}),
			)
	},
	async getEditedNotesToUpload(noteId?: NoteId, nook?: NookId) {
		const remoteTemplates = await ky
			.selectFrom('remoteTemplate')
			.selectAll()
			.execute()
		const notesAndStuff = await this.getEditedNotesToUploadDom(noteId)
		return await Promise.all(
			notesAndStuff
				.map(([, note]) => {
					const remotes = new Map(
						objEntries(note.remotes)
							.map(([remoteNook, remote]) => {
								if (nook != null && remoteNook !== nook) return null
								const rt =
									remoteTemplates.find(
										(rt) =>
											rt.localId === note.templateId && remoteNook === rt.nook,
									) ??
									C.toastImpossible(
										`No template found for id '${note.templateId}' with nook '${remoteNook}'.`,
									)
								return [
									remote?.remoteNoteId ??
										C.toastImpossible(
											`remoteNoteId for ${JSON.stringify({
												nook: remoteNook,
												noteId: note.id,
											})} is null.`,
										),
									fromLDbId<RemoteTemplateId | null>(rt.remoteId) ??
										C.toastImpossible(
											`remoteId for ${JSON.stringify({
												nook: remoteNook,
												noteId: note.id,
											})} is null.`,
										),
								] as const
							})
							.filter(notEmpty),
					)
					return domainToEditRemote(note, remotes)
				})
				.map(async (n) => await remotifyNote(n).then((x) => x.note)),
		)
	},
	async getEditedNotesToUploadDom(noteId?: NoteId) {
		const remoteNotes = await ky
			.selectFrom('remoteNote')
			.leftJoin('noteBase', 'remoteNote.localId', 'noteBase.id')
			.selectAll('remoteNote')
			.where('remoteId', 'is not', null)
			.whereRef('remoteNote.uploadDate', '<', 'noteBase.edited')
			.execute()
		const localIds = [...new Set(remoteNotes.map((t) => t.localId))]
		return await ky
			.selectFrom('note')
			.selectAll('note')
			.innerJoin('template', 'note.templateId', 'template.id')
			.select(templateSelection)
			.where('note.id', 'in', localIds)
			.$if(noteId != null, (db) => db.where('note.id', '=', toLDbId(noteId!)))
			.execute()
			.then((n) =>
				n.map((entity) => {
					const note = noteEntityToDomain(
						entity,
						remoteNotes.filter((rn) => rn.localId === entity.id),
					)
					if (objKeys(note.remotes).length === 0)
						C.toastImpossible(
							'Zero remotes - is something wrong with the SQL query?',
						)
					return [getTemplate(entity), note] as const
				}),
			)
	},
	getMediaToUpload,
	async makeNoteUploadable(
		remoteNote: Override<
			InsertObject<DB, 'remoteNote'>,
			{ localId: RemoteNote['localId'] }
		> & { note: Note },
	) {
		const { hashByLocal } = await remotifyNote(
			domainToCreateRemote(remoteNote.note, [
				/* this doesn't need any real values */
			]),
		)
		// @ts-expect-error kysley doesn't use note - it's only used by the above
		delete remoteNote.note
		await tx(async (db) => {
			await db
				.insertInto('remoteNote')
				.values(remoteNote)
				.onConflict((db) => db.doNothing())
				.execute()
			const srcs = new Set(hashByLocal.keys())
			const mediaBinaries = await db
				.selectFrom('media')
				.select(['id', 'data'])
				.where('id', 'in', Array.from(srcs))
				.execute()
			if (mediaBinaries.length !== srcs.size)
				C.toastFatal("You're missing a media.") // medTODO better error message
			// await db // F19F2731-BA29-406F-8F35-4E399CB40242
			// 	.deleteFrom('remoteMedia')
			// 	.where('localEntityId', '=', remoteNote.localId)
			// 	.where('localMediaId', 'in', Array.from(srcs))
			// 	.execute()
			if (hashByLocal.size !== 0) {
				await db
					.insertInto('remoteMedia')
					.values(
						Array.from(hashByLocal).map(
							([localMediaId]) =>
								({
									localEntityId: remoteNote.localId,
									localMediaId,
								}) satisfies InsertObject<DB, 'remoteMedia'>,
						),
					)
					.onConflict((db) =>
						db.doUpdateSet({
							localMediaId: (x) => x.ref('excluded.localMediaId'),
						}),
					)
					.execute()
			}
		})
	},
	async makeNoteNotUploadable(noteId: NoteId, nook: NookId) {
		const noteDbId = toLDbId(noteId)
		await tx(async (db) => {
			const r1 = await db
				.deleteFrom('remoteNote')
				.where('localId', '=', noteDbId)
				.where('nook', '=', nook)
				.returningAll()
				.execute()
			if (r1.length !== 1)
				C.toastWarn(
					`No remoteNote found for nook '${nook}' and noteId '${noteId}'`,
				)
			await db
				.deleteFrom('remoteMedia')
				.where('localEntityId', '=', noteDbId)
				.execute()
		})
	},
	async hasRemoteNote(remoteNoteId: RemoteNoteId) {
		const r = await ky
			.selectFrom('remoteNote')
			.where('remoteId', '=', toLDbId(remoteNoteId))
			.select(ky.fn.count<SqliteCount>('remoteId').as('count'))
			.executeTakeFirstOrThrow()
		return r.count >= 1
	},
}

async function remotifyNote<T extends CreateRemoteNote | EditRemoteNote>(
	note: T,
) {
	const fieldValues: Record<string, string> = {} satisfies T['fieldValues']
	const { docs, hashByLocal } = await remotifyDoms(objValues(note.fieldValues))
	let i = 0
	for (const field of objKeys(note.fieldValues)) {
		fieldValues[field] = docs[i]!.body.innerHTML
		i++
	}
	return {
		note: {
			...note,
			fieldValues,
		},
		hashByLocal,
	}
}
