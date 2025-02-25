import { Kysely, SqliteDialect } from 'kysely'
import { assert, expect, test } from 'vitest'
import {
	type DB,
	insertTemplates,
	createNook,
	insertNotes,
	getNotes,
	type NoteCursor,
	_kysely,
	type SortState,
} from '../src'
import {
	base64urlId,
	base64urlToArray,
	_binary,
	rawIdWithTime,
	prefixEpochToArray,
	idLength,
} from 'shared/binary'
import type { NookId, NoteId, TemplateId, UserId } from 'shared/brand'
import Database from 'better-sqlite3'
import * as fs from 'fs'
import path from 'path'
import { getDefaultTemplate } from 'shared/domain/template'
import { base16 } from '@scure/base'
import { dateToEpoch, maybeDateToEpoch, throwExp } from 'shared/utility'
import fc from 'fast-check'
import { cloneDeep } from 'lodash-es'

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

	const templateId = base64urlId<TemplateId>()
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

async function getAllNotes(sortState: SortState) {
	const paginatedNotes = [] as Note[]
	let count = 0
	do {
		count++
		if (count > 1000) throwExp(`loop count is ${count}, did you screw up?`)
		const last = paginatedNotes.at(-1)
		const cursor =
			last == null
				? null
				: ({
						noteEdited: dateToEpoch(last.noteEdited),
						subscribers: last.subscribers,
						comments: last.comments,
						til: maybeDateToEpoch(last.til),
						'note.id': last.id,
					} satisfies NoteCursor)
		const page = await getNotes({
			nook,
			userId,
			sortState: cloneDeep(sortState), // getNotes mutates this, which is fine in prod but not for testing
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
				id: 'note.id' as const,
				desc: desc ? ('desc' as const) : undefined,
			})),
			fc.boolean().map((desc) => ({
				id: 'noteEdited' as const,
				desc: desc ? ('desc' as const) : undefined,
			})),
		)
		.chain((x) => fc.shuffledSubarray(x, { minLength: 1, maxLength: 1 }))
	const arbNum = fc.integer({ min: 0, max: 5 })
	const createdEditeds = fc.uniqueArray(
		fc
			.record({
				created: arbNum,
				edited: arbNum,
				rawId: fc.uint8Array({ maxLength: idLength, minLength: idLength }),
			})
			.map((x) => {
				const id = new Uint8Array(x.rawId)
				prefixEpochToArray(x.created, id)
				return {
					...x,
					rawId: id,
				}
			}),
		{
			minLength: 1,
			maxLength: 100,
			selector: (x) => x.rawId,
			comparator: (a: Uint8Array, b: Uint8Array) => {
				if (a.length !== b.length) return false
				for (let i = 0; i < a.length; i++) {
					if (a[i] !== b[i]) return false
				}
				return true
			},
		},
	)
	let lastDb: Database.Database | undefined
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
				for (const { created, edited, rawId } of createdEditeds) {
					_binary.setRawId(() => rawId)
					const noteResponse = await insertNotes(userId, [
						{
							localId: base64urlId<NoteId>(),
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
						`UPDATE note SET created = ${created}, edited = ${edited} WHERE id = x'${hexNoteId}'`,
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
					lastDb = database
					throw e
				}
			},
		),
	)
	if (lastDb != null) {
		// fs.writeFileSync('shrunken.db', lastDb.serialize())
	}
})

function prettier({ remoteNoteId, ...n }: SimplifiedNote) {
	return {
		...n,
		// id: arrayToBase64url(remoteNoteId),
		id: remoteNoteId.join(' '),
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
	sortState: SortState,
): number {
	/* eslint-disable @typescript-eslint/strict-boolean-expressions */
	for (const { id, desc } of sortState) {
		if (id === 'note.id') {
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

test.each([
	{
		sortState: [
			{
				id: 'note.id' as const,
				desc: undefined,
			},
			{
				id: 'noteEdited' as const,
				desc: 'desc' as const,
			},
		],
		// This isn't great but users can't sort by multiple columns anyway
		expected: `SCAN note
BLOOM FILTER ON template (nook=? AND id=?)
SEARCH template USING INDEX template_nook_idx (nook=? AND id=?)
SEARCH noteSubscriber USING PRIMARY KEY (noteId=? AND userId=?) LEFT-JOIN`,
	},
	{
		sortState: [],
		expected: `SEARCH note USING PRIMARY KEY (id<?)
BLOOM FILTER ON template (nook=? AND id=?)
SEARCH template USING INDEX template_nook_idx (nook=? AND id=?)
SEARCH noteSubscriber USING PRIMARY KEY (noteId=? AND userId=?) LEFT-JOIN`,
	},
	{
		sortState: [
			{
				id: 'note.id' as const,
				desc: undefined,
			},
		],
		expected: `SEARCH note USING PRIMARY KEY (id>?)
BLOOM FILTER ON template (nook=? AND id=?)
SEARCH template USING INDEX template_nook_idx (nook=? AND id=?)
SEARCH noteSubscriber USING PRIMARY KEY (noteId=? AND userId=?) LEFT-JOIN`,
	},
	{
		sortState: [
			{
				id: 'noteEdited' as const,
				desc: undefined,
			},
		],
		expected: `SCAN note USING INDEX note_edited_idx
BLOOM FILTER ON template (nook=? AND id=?)
SEARCH template USING INDEX template_nook_idx (nook=? AND id=?)
SEARCH noteSubscriber USING PRIMARY KEY (noteId=? AND userId=?) LEFT-JOIN`,
	},
	{
		sortState: [
			{
				id: 'note.id' as const,
				desc: 'desc' as const,
			},
		],
		expected: `SEARCH note USING PRIMARY KEY (id<?)
BLOOM FILTER ON template (nook=? AND id=?)
SEARCH template USING INDEX template_nook_idx (nook=? AND id=?)
SEARCH noteSubscriber USING PRIMARY KEY (noteId=? AND userId=?) LEFT-JOIN`,
	},
	{
		sortState: [
			{
				id: 'noteEdited' as const,
				desc: 'desc' as const,
			},
		],
		expected: `SCAN note USING INDEX note_edited_idx
BLOOM FILTER ON template (nook=? AND id=?)
SEARCH template USING INDEX template_nook_idx (nook=? AND id=?)
SEARCH noteSubscriber USING PRIMARY KEY (noteId=? AND userId=?) LEFT-JOIN`,
	},
])('sort uses indexes - $sortState', async ({ sortState, expected }) => {
	_kysely.resetSqlLog()
	const rows = 100
	const { database, remoteTemplateId } = await setupDb()
	database.exec(`SAVEPOINT my_savepoint;`)
	for (let index = 0; index < rows; index++) {
		const created = Math.round((Math.random() * rows) / 10)
		const edited = Math.round(Math.random() * rows)
		_binary.setRawId(() => rawIdWithTime(created))
		const noteResponse = await insertNotes(userId, [
			{
				localId: base64urlId<NoteId>(),
				fieldValues: {},
				tags: [],
				remoteTemplateIds: [remoteTemplateId],
			},
		])
		const remoteNoteId = Array.from(noteResponse.values())[0]![0]
		const rawRemoteNoteId = base64urlToArray(remoteNoteId)
		const hexNoteId = base16.encode(rawRemoteNoteId)
		database.exec(
			`UPDATE note SET created = ${created}, edited = ${edited} WHERE id = x'${hexNoteId}'`,
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

	try {
		expect(details).toEqual(expected)
	} catch (error) {
		console.error(details)
		throw error
	}
})
