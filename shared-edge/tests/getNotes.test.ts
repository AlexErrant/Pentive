import { Kysely, SqliteDialect } from 'kysely'
import { assert, expect, test } from 'vitest'
import {
	ulidAsRaw,
	type DB,
	insertTemplates,
	createNook,
	insertNotes,
	getNotes,
	type NoteCursor,
	_kysely,
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
	_kysely.setDb(
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

async function getAllNotes(
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
) {
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
	return paginatedNotes
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
				_kysely.resetSqlLog()
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

				_kysely.setPageSize(100_000_000)
				const sqlSorted = await getNotes({
					nook,
					userId,
					sortState,
					cursor: null,
				}).then((x) => x.map(simplifyNote))

				// Act
				_kysely.setPageSize(3)
				const paginatedNotes = await getAllNotes(sortState)

				// Assert
				const actualNotes = paginatedNotes.map(simplifyNote)
				try {
					assert.sameDeepOrderedMembers(actualNotes, jsSorted)
					assert.sameDeepOrderedMembers(actualNotes, sqlSorted)
				} catch (e) {
					console.log('=================================================')
					console.log('sortState', sortState)
					console.log('actualNotes', actualNotes.map(prettier))
					console.log('jsSorted', jsSorted.map(prettier))
					console.log('sqlLog', _kysely.sqlLog.map(_kysely.prettierSqlLog))
					throw e
				}
			},
		),
	)
})

function prettier({ remoteNoteId, ...n }: SimplifiedNote) {
	return {
		...n,
		id: arrayToBase64url(remoteNoteId),
	}
}

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

// https://stackoverflow.com/a/9175302
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

test('multiple sort columns search using indexes', async () => {
	const rows = 1000
	const { database, remoteTemplateId } = await setupDb()
	const sortState = [
		{
			id: 'noteCreated' as const,
			desc: undefined,
		},
		{
			id: 'noteEdited' as const,
			desc: 'desc' as const,
		},
	]
	database.exec(`SAVEPOINT my_savepoint;`)
	for (let index = 0; index < rows; index++) {
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
		const hexNoteId = base16.encode(rawRemoteNoteId)
		const created = Math.round((Math.random() * rows) / 10)
		const edited = Math.round(Math.random() * rows)
		database.exec(
			`UPDATE note SET created = ${created}, edited = ${edited} WHERE id = unhex('${hexNoteId}')`,
		)
	}
	database.exec(`RELEASE SAVEPOINT my_savepoint;`)

	// Act
	await getAllNotes(sortState)

	// Assert
	const midpoint = Math.round(_kysely.sqlLog.length / 2)
	const { sql, parameters } = _kysely.sqlLog.at(midpoint)!

	database.exec('ANALYZE;')
	const queryPlan = database
		.prepare(`EXPLAIN QUERY PLAN ${sql}`)
		.all(parameters) as Array<{
		detail: string
	}>

	const details = queryPlan.map((q) => q.detail).join('\n')

	// I'm not thrilled at `SCAN note USING INDEX` but whatever
	expect(details).matches(
		new RegExp(`(SCAN template
MULTI-INDEX OR
INDEX 1
SEARCH note USING INDEX note.*?_idx .*?
INDEX 2
SEARCH note USING INDEX note_.*?_idx .*?
INDEX 3
SEARCH note USING INDEX note_.*?_idx .*?
CORRELATED SCALAR SUBQUERY 1
SEARCH noteSubscriber USING INDEX sqlite_autoindex_noteSubscriber_1 \\(noteId=\\? AND userId=\\?\\)
USE TEMP B-TREE FOR ORDER BY)|(SCAN note USING INDEX note_.*?_idx
SCAN template
CORRELATED SCALAR SUBQUERY 1
SEARCH noteSubscriber USING INDEX sqlite_autoindex_noteSubscriber_1 \\(noteId=\\? AND userId=\\?\\)
USE TEMP B-TREE FOR LAST 2 TERMS OF ORDER BY)`),
	)
})
