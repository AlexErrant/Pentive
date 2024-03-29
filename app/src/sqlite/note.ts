import {
	type CreateRemoteNote,
	type EditRemoteNote,
	type NookId,
	type RemoteNoteId,
	stringifyMap,
	type NoteId,
	type MediaId,
	type RemoteMediaNum,
	type RemoteTemplateId,
	type Note,
} from 'shared'
import { type DB } from './database'
import { type InsertObject } from 'kysely'
import _ from 'lodash'
import { C, ky, tx } from '../topLevelAwait'
import {
	noteEntityToDomain,
	stringifyTags,
	updateLocalMediaIdByRemoteMediaIdAndGetNewDoc,
} from './util'

function noteToDocType(note: Note): InsertObject<DB, 'note'> {
	const now = C.getDate().getTime()
	const r: InsertObject<DB, 'note'> = {
		id: note.id,
		templateId: note.templateId,
		created: now,
		updated: now,
		tags: stringifyTags(note.tags),
		fieldValues: stringifyMap(note.fieldValues),
		ankiNoteId: note.ankiNoteId,
	}
	return r
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

export const noteCollectionMethods = {
	upsertNote: async function (note: Note) {
		const values = noteToDocType(note)
		const conflictValues = { ...values, id: undefined, created: undefined }
		await ky
			.insertInto('note')
			.values(values)
			.onConflict((db) => db.doUpdateSet(conflictValues))
			.execute()
	},
	bulkInsertNotes: async function (notes: Note[]) {
		const batches = _.chunk(notes.map(noteToDocType), 1000)
		for (let i = 0; i < batches.length; i++) {
			C.toastInfo('note batch ' + i)
			await ky.insertInto('note').values(batches[i]!).execute()
		}
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
						if (note.remotes.size === 0)
							C.toastImpossible(
								'Zero remotes - is something wrong with the SQL query?',
							)
						const remoteIds = Array.from(note.remotes).map(([nook]) => {
							const rt =
								remoteTemplates.find(
									(rt) => rt.localId === note.templateId && nook === rt.nook,
								) ??
								C.toastImpossible(
									`No template found for id '${note.templateId}' with nook '${nook}'.`,
								)
							return (
								(rt.remoteId as RemoteTemplateId) ??
								C.toastImpossible(`Template ${rt.localId} has no remoteId.`)
							)
						})
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
			.leftJoin('note', 'remoteNote.localId', 'note.id')
			.selectAll('remoteNote')
			.where('remoteId', 'is not', null)
			.whereRef('remoteNote.uploadDate', '<', 'note.updated')
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
						if (note.remotes.size === 0)
							C.toastImpossible(
								'Zero remotes - is something wrong with the SQL query?',
							)
						const remotes = new Map(
							Array.from(note.remotes).map(([nook, remote]) => {
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
			.innerJoin('note', 'remoteMedia.localEntityId', 'note.id')
			.leftJoin('remoteNote', 'remoteNote.localId', 'note.id')
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
					eb('media.updated', '>', ref('remoteMedia.uploadDate')),
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
	updateNote: async function (note: Note) {
		const { id, created, ...rest } = noteToDocType(note)
		const r = await ky
			.updateTable('note')
			.set(rest)
			.where('id', '=', id)
			.returningAll()
			.execute()
		if (r.length !== 1) C.toastFatal(`No note found for id '${note.id}'.`)
	},
}

function withLocalMediaIdByRemoteMediaId<
	T extends CreateRemoteNote | EditRemoteNote,
>(dp: DOMParser, note: T) {
	const fieldValues = new Map<string, string>()
	const { docs, remoteMediaIdByLocal } =
		updateLocalMediaIdByRemoteMediaIdAndGetNewDoc(
			dp,
			Array.from(note.fieldValues.values()),
		)
	let i = 0
	for (const [field] of note.fieldValues) {
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
