import { Kysely, SqliteDialect } from 'kysely'
import { assert, test } from 'vitest'
import {
	ulidAsRaw,
	type DB,
	insertTemplates,
	createNook,
	insertNotes,
	getNotes,
	type NoteCursor,
	forTestsOnly,
} from '../src'
import { arrayToBase64url, base64urlToArray } from 'shared/binary'
import type { NookId, NoteId, TemplateId, UserId } from 'shared/brand'
import Database from 'better-sqlite3'
import * as fs from 'fs'
import path from 'path'
import { getDefaultTemplate } from 'shared/domain/template'
import { base16 } from '@scure/base'
import { dateToEpoch, maybeDateToEpoch, throwExp } from 'shared/utility'
import fc from 'fast-check'

const userId = 'Griddle' as UserId
const nook = 'testnook' as NookId

const ivySchemaPath = path.join(__dirname, '..', 'ivySchema.sql')
const sqlScript = await fs.promises.readFile(ivySchemaPath, 'utf8')

async function setupDb() {
	const database = new Database(':memory:')
	database.exec(sqlScript)
	forTestsOnly.setDb(
		new Kysely<DB>({
			dialect: new SqliteDialect({
				database,
			}),
		}),
	)

	await createNook({
		nook,
		nookType: 'public',
		userId,
		sidebar: '',
		description: '',
	})

	const templateId = arrayToBase64url(ulidAsRaw()) as TemplateId
	const template = getDefaultTemplate(templateId)
	const templateResponse = await insertTemplates(userId, [
		{
			...template,
			nooks: [nook],
			localId: templateId,
			fields: template.fields.map((f) => f.name),
		},
	])
	const remoteTemplateId = Array.from(templateResponse.values())[0]![0]

	return { database, remoteTemplateId }
}

test('cursor/keyset pagination works for getNotes', async () => {
	const sortState = fc
		.tuple(
			fc.boolean().map((desc) => ({
				id: 'noteCreated' as const,
				desc: desc ? ('desc' as const) : undefined,
			})),
			fc.boolean().map((desc) => ({
				id: 'noteEdited' as const,
				desc: desc ? ('desc' as const) : undefined,
			})),
		)
		.chain((x) => fc.shuffledSubarray(x, { minLength: 2, maxLength: 2 }))
	const arbNum = fc.integer({ min: 0, max: 5 })
	const createdEditeds = fc.array(
		fc.record({
			created: arbNum,
			edited: arbNum,
		}),
		{ minLength: 1, maxLength: 100 },
	)
	await fc.assert(
		fc.asyncProperty(
			fc.record({
				createdEditeds,
				sortState,
			}),
			async ({ createdEditeds, sortState }) => {
				const { database, remoteTemplateId } = await setupDb()
				const jsSorted: SimplifiedNote[] = []
				for (const { created, edited } of createdEditeds) {
					const noteResponse = await insertNotes(userId, [
						{
							localId: arrayToBase64url(ulidAsRaw()) as NoteId,
							fieldValues: {},
							tags: [],
							remoteTemplateIds: [remoteTemplateId],
						},
					])
					const remoteNoteId = Array.from(noteResponse.values())[0]![0]
					const rawRemoteNoteId = base64urlToArray(remoteNoteId)
					jsSorted.push({ created, edited, remoteNoteId: rawRemoteNoteId })
					const hexNoteId = base16.encode(rawRemoteNoteId)
					database.exec(
						`UPDATE note SET created = ${created}, edited = ${edited} WHERE id = unhex('${hexNoteId}')`,
					)
				}
				jsSorted.sort((a, b) => sort(a, b, sortState))

				forTestsOnly.setPageSize(100_000_000)
				const sqlSorted = await getNotes({
					nook,
					userId,
					sortState,
					cursor: null,
				}).then((x) => x.map(simplifyNote))

				// Act

				forTestsOnly.setPageSize(3)
				const paginatedNotes = [] as Note[]
				do {
					const last = paginatedNotes.at(-1)
					const cursor =
						last == null
							? null
							: ({
									noteCreated: dateToEpoch(last.noteCreated),
									noteEdited: dateToEpoch(last.noteEdited),
									subscribers: last.subscribers,
									comments: last.comments,
									til: maybeDateToEpoch(last.til),
									noteId: last.id,
								} satisfies NoteCursor)
					const page = await getNotes({
						nook,
						userId,
						sortState,
						cursor,
					})
					if (page.length === 0) {
						break
					} else {
						paginatedNotes.push(...page)
					}
				} while (true as boolean)

				// Assert
				const actualNotes = paginatedNotes.map(simplifyNote)
				assert.sameDeepOrderedMembers(actualNotes, jsSorted)
				assert.sameDeepOrderedMembers(actualNotes, sqlSorted)
			},
		),
	)
})

type Note = Awaited<ReturnType<typeof getNotes>>[0]

function simplifyNote(note: Note) {
	return {
		created: dateToEpoch(note.note.created),
		edited: dateToEpoch(note.note.edited),
		remoteNoteId: base64urlToArray(note.id),
	} satisfies SimplifiedNote
}

interface SimplifiedNote {
	created: number
	edited: number
	remoteNoteId: Uint8Array<ArrayBuffer>
}

function sort(
	a: SimplifiedNote,
	b: SimplifiedNote,
	sortState: Array<
		| {
				id: 'noteCreated'
				desc: 'desc' | undefined
		  }
		| {
				id: 'noteEdited'
				desc: 'desc' | undefined
		  }
	>,
): number {
	/* eslint-disable @typescript-eslint/strict-boolean-expressions */
	for (const { id, desc } of sortState) {
		if (id === 'noteCreated') {
			if (a.created > b.created) return desc ? -1 : 1
			if (a.created < b.created) return desc ? 1 : -1
		}
		if (id === 'noteEdited') {
			if (a.edited > b.edited) return desc ? -1 : 1
			if (a.edited < b.edited) return desc ? 1 : -1
		}
	}
	const desc = sortState.at(-1)!.desc // noteId is asc/desc depending on the last sort col
	for (let i = 0; i < a.remoteNoteId.length; i++) {
		if (a.remoteNoteId[i]! > b.remoteNoteId[i]!) return desc ? -1 : 1
		if (a.remoteNoteId[i]! < b.remoteNoteId[i]!) return desc ? 1 : -1
	}
	throwExp()
	/* eslint-enable @typescript-eslint/strict-boolean-expressions */
}
