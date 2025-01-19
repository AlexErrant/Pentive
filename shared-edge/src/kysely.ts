import {
	Kysely,
	sql,
	type InsertResult,
	type RawBuilder,
	type InsertObject,
	type Compilable,
	type SqlBool,
	type OnConflictTables,
	type OnConflictDatabase,
	type ExpressionBuilder,
} from 'kysely'
import { LibsqlDialect } from '@libsql/kysely-libsql'
import { type Note, type DB, type Template } from './dbSchema'
import {
	type Base64Url,
	type DbId,
	type RemoteTemplateId,
	type NookId,
	type RemoteNoteId,
	type UserId,
	type TemplateId,
	type CommentId,
	type NoteId,
	type Hex,
	type MediaHash,
	type Base64,
	type MediaId,
	type RemoteMediaId,
} from 'shared/brand'
import { ftsNormalize } from 'shared/htmlToText'
import { imgPlaceholder } from 'shared/image'
import {
	type RemoteTemplate,
	type RemoteNote,
	type CreateRemoteNote,
	type CreateRemoteTemplate,
	type EditRemoteNote,
	type EditRemoteTemplate,
	type TemplateType,
} from 'shared/schema'
import {
	nullMap,
	undefinedMap,
	throwExp,
	type SqliteCount,
	objEntries,
	escapeRegExp,
} from 'shared/utility'
import { ulidAsHex, ulidAsRaw } from './convertBinary'
import { base16 } from '@scure/base'
import { createClient } from '@libsql/client/web'
import {
	arrayToBase64,
	arrayToBase64url,
	base64ToArray,
	base64urlToArray,
} from 'shared/binary'
import { buildPublicToken, type PublicMediaSecret } from './publicToken'
export type * from 'kysely'

// @ts-expect-error db calls should throw null error if not setup
export let db: Kysely<DB> = null as Kysely<DB>
export let publicMediaSecretBase64: PublicMediaSecret =
	null as PublicMediaSecret

export function setKysely(
	url: string,
	authToken: string,
	publicMediaSecret: PublicMediaSecret,
): void {
	if (db == null) {
		db = new Kysely<DB>({
			dialect: new LibsqlDialect({
				client: createClient({
					url,
					authToken,
				}),
			}),
		})
		publicMediaSecretBase64 = publicMediaSecret
	}
}

export async function getPosts({ nook }: { nook: string }): Promise<
	Array<{
		id: Base64Url
		title: string
		text: string
		authorId: string
	}>
> {
	return await db
		.selectFrom('post')
		.select(['id', 'title', 'text', 'authorId'])
		.where('nook', '=', nook)
		.execute()
		.then((ps) => ps.map(mapIdToBase64Url))
}

export function epochToDate(epoch: number) {
	return new Date(epoch * 1000)
}
function maybeEpochToDate(epoch: number | null | undefined) {
	if (epoch == null) return null
	return epochToDate(epoch)
}

function toTemplate(
	x: {
		templateId: DbId
		templateName: string
		templateCreated: number
		templateEdited: number
		nook: string
		css: string
		type: string
		fields: string
	},
	templateId: RemoteTemplateId,
) {
	return {
		id: templateId,
		name: x.templateName,
		nook: x.nook as NookId,
		created: epochToDate(x.templateCreated),
		edited: epochToDate(x.templateEdited),
		fields: deserializeFields(x.fields),
		css: x.css,
		templateType: deserializeTemplateType(x.type),
	} satisfies RemoteTemplate
}

function noteToNookView(x: {
	id: DbId
	templateId: DbId
	templateName: string
	templateCreated: number
	templateEdited: number
	noteCreated: number
	noteEdited: number
	tags: string
	nook: string
	fieldValues: string
	css: string
	type: string
	fields: string
	subscribers: number
	comments: number
	til?: number | null
}) {
	const noteId = dbIdToBase64Url<RemoteNoteId>(x.id)
	const templateId = dbIdToBase64Url<RemoteTemplateId>(x.templateId)
	return {
		id: noteId,
		subscribers: x.subscribers,
		comments: x.comments,
		til: maybeEpochToDate(x.til),
		note: toNote(x, noteId, templateId),
		template: toTemplate(x, templateId),
	}
}

function toNote(
	x: {
		nook: string
		fieldValues: string
		id: DbId
		templateId: DbId
		ankiNoteId?: number
		noteCreated: number
		noteEdited: number
		tags: string
	},
	noteId: RemoteNoteId,
	templateId: RemoteTemplateId,
): RemoteNote {
	return {
		nook: x.nook as NookId,
		fieldValues: deserializeFieldValues(x.fieldValues),
		id: noteId,
		templateId,
		created: epochToDate(x.noteCreated),
		edited: epochToDate(x.noteEdited),
		tags: deserializeTags(x.tags),
		ankiId: x.ankiNoteId,
	}
}

export async function getUserIdByEmail(email: string) {
	return await db
		.selectFrom('user')
		// Emails are case sensitive, so lookups are case sensitive for max security
		.where('email', '=', email)
		.select(['id'])
		.executeTakeFirst()
}

export async function getCasedUserId(userId: string) {
	return await db
		.selectFrom('user')
		.where('id', '=', userId)
		.select(['id'])
		.executeTakeFirst()
}

export async function registerUser(id: string, email: string) {
	await db.insertInto('user').values({ id, email }).execute()
}

export async function getNotes(nook: NookId, userId: UserId | null) {
	const r = await db
		.selectFrom('note')
		.innerJoin('template', 'template.id', 'note.templateId')
		.select([
			'note.id',
			'note.fieldValues',
			'note.created as noteCreated',
			'note.edited as noteEdited',
			'note.tags',
			'note.subscribersCount as subscribers',
			'note.commentsCount as comments',
			'template.id as templateId',
			'template.name as templateName',
			'template.created as templateCreated',
			'template.edited as templateEdited',
			'template.nook as nook',
			'template.css',
			'template.fields',
			'template.type',
		])
		.$if(userId != null, (a) =>
			a.select((b) =>
				b
					.selectFrom('noteSubscriber')
					.select(['til'])
					.where('userId', '=', userId)
					.whereRef('noteSubscriber.noteId', '=', 'note.id')
					.as('til'),
			),
		)
		.where('template.nook', '=', nook)
		.execute()
	return r.map(noteToNookView)
}

export async function getNote(noteId: RemoteNoteId, userId: UserId | null) {
	const r = await db
		.selectFrom('note')
		.innerJoin('template', 'template.id', 'note.templateId')
		.select([
			'note.templateId',
			'note.created',
			'note.edited',
			'note.authorId',
			'note.fieldValues',
			'note.tags',
			'note.ankiId',
			'template.id as templateId',
			'template.name as templateName',
			'template.created as templateCreated',
			'template.edited as templateEdited',
			'template.nook as nook',
			'template.css',
			'template.fields',
			'template.type',
		])
		.$if(userId != null, (a) =>
			a.select((b) =>
				b
					.selectFrom('noteSubscriber')
					.select(['til'])
					.where('userId', '=', userId)
					.whereRef('noteSubscriber.noteId', '=', 'note.id')
					.as('til'),
			),
		)
		.where('note.id', '=', fromBase64Url(noteId))
		.executeTakeFirst()
	if (r == null) return null
	const templateId = dbIdToBase64Url<RemoteTemplateId>(r.templateId)
	return {
		id: noteId,
		templateId,
		created: epochToDate(r.created),
		edited: epochToDate(r.edited),
		authorId: r.authorId as UserId,
		fieldValues: deserializeFieldValues(r.fieldValues),
		tags: deserializeTags(r.tags),
		ankiId: r.ankiId ?? undefined,
		til: maybeEpochToDate(r.til),
		nook: r.nook,
		template: toTemplate(r, templateId),
	} satisfies RemoteNote & Record<string, unknown>
}

export async function searchNotes(input: string, userId: UserId | null) {
	const r = await db
		.selectFrom('note')
		.innerJoin('template', 'template.id', 'note.templateId')
		.select([
			'note.id',
			'note.fieldValues',
			'note.created as noteCreated',
			'note.edited as noteEdited',
			'note.tags',
			'note.subscribersCount as subscribers',
			'note.commentsCount as comments',
			'template.id as templateId',
			'template.name as templateName',
			'template.created as templateCreated',
			'template.edited as templateEdited',
			'template.nook as nook',
			'template.css',
			'template.fields',
			'template.type',
		])
		.$if(userId != null, (a) =>
			a.select((b) =>
				b
					.selectFrom('noteSubscriber')
					.select(['til'])
					.where('userId', '=', userId)
					.whereRef('noteSubscriber.noteId', '=', 'note.id')
					.as('til'),
			),
		)
		.where(
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			sql`MATCH(fts) AGAINST (${input} IN NATURAL LANGUAGE MODE)` as RawBuilder<SqlBool>,
		)
		.execute()
	return r.map(noteToNookView)
}

// https://stackoverflow.com/a/18018037
function listToTree<T extends Base64Url>(list: Array<Comment<T>>) {
	const map = new Map<Base64Url, number>()
	let node
	const roots = []
	let i
	for (i = 0; i < list.length; i += 1) {
		map.set(list[i]!.id, i)
	}
	for (i = 0; i < list.length; i += 1) {
		node = list[i]!
		if (node.parentId !== null) {
			list[map.get(node.parentId)!]!.comments.push(node)
		} else {
			roots.push(node)
		}
	}
	return roots
}

export interface Comment<T extends Base64Url> {
	id: CommentId
	parentId: CommentId | null
	entityId: T
	created: Date
	edited: Date
	text: string
	authorId: string
	votes: string
	level: number
	comments: Array<Comment<T>>
}

export type TemplateComment = Comment<RemoteTemplateId>
export type NoteComment = Comment<RemoteNoteId>

export async function getTemplateComments(templateId: RemoteTemplateId) {
	const cs = await db
		.selectFrom('templateComment')
		.select([
			'id',
			'parentId',
			'created',
			'edited',
			'text',
			'authorId',
			'votes',
			'level',
		])
		.where('templateComment.templateId', '=', fromBase64Url(templateId))
		.orderBy('level', 'asc')
		.orderBy('votes', 'desc')
		.execute()
	const commentsList = cs.map(
		(c) =>
			({
				id: dbIdToBase64Url(c.id),
				parentId: nullMap(c.parentId, dbIdToBase64Url<CommentId>),
				entityId: templateId,
				created: epochToDate(c.created),
				edited: epochToDate(c.edited),
				text: c.text,
				authorId: c.authorId as UserId,
				votes: c.votes,
				level: c.level,
				comments: [],
			}) satisfies TemplateComment,
	)
	return listToTree(commentsList)
}

export async function getNoteComments(noteId: RemoteNoteId) {
	const cs = await db
		.selectFrom('noteComment')
		.select([
			'id',
			'parentId',
			'created',
			'edited',
			'text',
			'authorId',
			'votes',
			'level',
		])
		.where('noteComment.noteId', '=', fromBase64Url(noteId))
		.orderBy('level', 'asc')
		.orderBy('votes', 'desc')
		.execute()
	const commentsList = cs.map(
		(c) =>
			({
				id: dbIdToBase64Url(c.id),
				parentId: nullMap(c.parentId, dbIdToBase64Url<CommentId>),
				entityId: noteId,
				created: epochToDate(c.created),
				edited: epochToDate(c.edited),
				text: c.text,
				authorId: c.authorId as UserId,
				votes: c.votes,
				level: c.level,
				comments: [],
			}) satisfies NoteComment,
	)
	return listToTree(commentsList)
}

export async function getPost(id: Base64Url): Promise<
	| {
			id: Base64Url
			title: string
			text: string
			authorId: string
	  }
	| undefined
> {
	return await db
		.selectFrom('post')
		.select(['id', 'title', 'text', 'authorId'])
		.where('id', '=', fromBase64Url(id))
		.executeTakeFirst()
		.then((x) => undefinedMap(x, mapIdToBase64Url))
}

export async function getTemplate(
	id: RemoteTemplateId,
	opts?: { nook?: NookId; userId?: UserId },
) {
	const t = await db
		.selectFrom('template')
		.selectAll('template')
		.where('id', '=', fromBase64Url(id))
		.$if(opts?.nook != null, (db) => db.where('nook', '=', opts!.nook!))
		.$if(opts?.userId != null, (a) =>
			a.select((b) =>
				b
					.selectFrom('templateSubscriber')
					.select(['til'])
					.where('userId', '=', opts!.userId!)
					.whereRef('templateSubscriber.templateId', '=', 'template.id')
					.as('til'),
			),
		)
		.executeTakeFirst()
	return undefinedMap(t, templateEntityToDomain)
}

export async function getTemplates(nook: NookId, userId?: UserId) {
	const ts = await db
		.selectFrom('template')
		.selectAll('template')
		.where('nook', '=', nook)
		.$if(userId != null, (a) =>
			a.select((b) =>
				b
					.selectFrom('templateSubscriber')
					.select(['til'])
					.where('userId', '=', userId!)
					.whereRef('templateSubscriber.templateId', '=', 'template.id')
					.as('til'),
			),
		)
		.execute()
	return ts.map(templateEntityToDomain)
}

function templateEntityToDomain(t: {
	id: DbId
	created: number
	edited: number
	name: string
	nook: NookId
	type: string
	fields: string
	css: string
	ankiId: number | null
	subscribersCount: number
	commentsCount: number
	til?: number | null
}) {
	return {
		id: dbIdToBase64Url(t.id),
		name: t.name,
		nook: t.nook,
		css: t.css,
		fields: deserializeFields(t.fields),
		created: epochToDate(t.created),
		edited: epochToDate(t.edited),
		templateType: deserializeTemplateType(t.type),
		subscribers: t.subscribersCount,
		comments: t.commentsCount,
		til: maybeEpochToDate(t.til),
	} satisfies RemoteTemplate & Record<string, unknown>
}

export async function insertPost({
	authorId,
	nook,
	text,
	title,
	id,
}: {
	authorId: string
	nook: string
	text: string
	title: string
	id: Hex
}): Promise<InsertResult[]> {
	return await db
		.insertInto('post')
		.values({
			id: unhex(id),
			authorId,
			nook,
			text,
			title,
		})
		.execute()
}

export async function insertTemplateComment(
	templateId: RemoteTemplateId,
	text: string,
	authorId: UserId,
) {
	const templateDbId = fromBase64Url(templateId)
	await db.transaction().execute(
		async (tx) =>
			await Promise.all([
				db
					.selectFrom('template')
					.select(['id'])
					.where('template.id', '=', templateDbId)
					.executeTakeFirst()
					.then((r) => {
						if (r == null) throwExp(`Template ${templateId} not found.`)
					}),
				tx
					.updateTable('template')
					.set({
						commentsCount: (x) => sql`${x.ref('commentsCount')} + 1`,
					})
					.where('template.id', '=', templateDbId)
					.execute(),
				tx
					.insertInto('templateComment')
					.values({
						id: unhex(ulidAsHex()),
						authorId,
						level: 0,
						templateId: templateDbId,
						votes: '',
						text,
					})
					.execute(),
			]),
	)
}

export async function insertTemplateChildComment(
	parentCommentId: CommentId,
	text: string,
	authorId: UserId,
) {
	const parentCommentDbId = fromBase64Url(parentCommentId)
	const parent = await db
		.selectFrom('templateComment')
		.select(['level', 'templateId'])
		.where('id', '=', parentCommentDbId)
		.executeTakeFirst()
	if (parent == null) throwExp(`Comment ${parentCommentId} not found.`)
	await db.transaction().execute(
		async (tx) =>
			await Promise.all([
				tx
					.updateTable('template')
					.set({
						commentsCount: (x) => sql`${x.ref('commentsCount')} + 1`,
					})
					.where('template.id', '=', parent.templateId)
					.execute(),
				await tx
					.insertInto('templateComment')
					.values({
						id: unhex(ulidAsHex()),
						authorId,
						level: parent.level + 1,
						templateId: parent.templateId,
						votes: '',
						text,
						parentId: parentCommentDbId,
					})
					.execute(),
			]),
	)
}

export async function insertNoteComment(
	noteId: RemoteNoteId,
	text: string,
	authorId: UserId,
) {
	const noteDbId = fromBase64Url(noteId)
	await db.transaction().execute(
		async (tx) =>
			await Promise.all([
				db
					.selectFrom('note')
					.select(['id'])
					.where('note.id', '=', noteDbId)
					.executeTakeFirst()
					.then((r) => {
						if (r == null) throwExp(`Note ${noteId} not found.`)
					}),
				tx
					.updateTable('note')
					.set({
						commentsCount: (x) => sql`${x.ref('commentsCount')} + 1`,
					})
					.where('note.id', '=', noteDbId)
					.execute(),
				tx
					.insertInto('noteComment')
					.values({
						id: unhex(ulidAsHex()),
						authorId,
						level: 0,
						noteId: noteDbId,
						votes: '',
						text,
					})
					.execute(),
			]),
	)
}

export async function insertNoteChildComment(
	parentCommentId: CommentId,
	text: string,
	authorId: UserId,
) {
	const parentCommentDbId = fromBase64Url(parentCommentId)
	const parent = await db
		.selectFrom('noteComment')
		.select(['level', 'noteId'])
		.where('id', '=', parentCommentDbId)
		.executeTakeFirst()
	if (parent == null) throwExp(`Comment ${parentCommentId} not found.`)
	await db.transaction().execute(
		async (tx) =>
			await Promise.all([
				tx
					.updateTable('note')
					.set({
						commentsCount: (x) => sql`${x.ref('commentsCount')} + 1`,
					})
					.where('note.id', '=', parent.noteId)
					.execute(),
				await tx
					.insertInto('noteComment')
					.values({
						id: unhex(ulidAsHex()),
						authorId,
						level: parent.level + 1,
						noteId: parent.noteId,
						votes: '',
						text,
						parentId: parentCommentDbId,
					})
					.execute(),
			]),
	)
}

export async function userOwnsNoteAndHasMedia(
	ids: RemoteNoteId[],
	authorId: UserId,
	id: MediaHash,
): Promise<{
	userOwns: boolean
	hasMedia: boolean
}> {
	const { hasMedia, userOwns } = await db
		.selectFrom([
			db
				.selectFrom('note')
				.select(db.fn.count<SqliteCount>('id').as('userOwns'))
				.where('id', 'in', ids.map(fromBase64Url))
				.where('authorId', '=', authorId)
				.as('userOwns'),
			db
				.selectFrom('media')
				.select(db.fn.count<SqliteCount>('hash').as('hasMedia'))
				.where('hash', '=', id)
				.as('hasMedia'),
		])
		.selectAll()
		.executeTakeFirstOrThrow()
	return {
		userOwns: userOwns === ids.length,
		hasMedia: hasMedia !== 0,
	}
}

export async function userOwnsTemplateAndHasMedia(
	ids: RemoteTemplateId[],
	authorId: UserId,
	id: MediaHash,
): Promise<{
	userOwns: boolean
	hasMedia: boolean
}> {
	const { hasMedia, userOwns } = await db
		.selectFrom([
			db
				.selectFrom('template')
				.select(db.fn.count<SqliteCount>('id').as('userOwns'))
				.where('id', 'in', ids.map(fromBase64Url))
				// .where("authorId", "=", authorId) // highTODO
				.as('userOwns'),
			db
				.selectFrom('media')
				.select(db.fn.count<SqliteCount>('hash').as('hasMedia'))
				.where('hash', '=', id)
				.as('hasMedia'),
		])
		.selectAll()
		.executeTakeFirstOrThrow()
	return {
		userOwns: userOwns === ids.length,
		hasMedia: hasMedia !== 0,
	}
}

export async function lookupMediaHash(id: MediaId) {
	const mediaHash = await db
		.selectFrom('media')
		.select('hash')
		.where('id', '=', fromBase64Url(id))
		.executeTakeFirst()
	return mediaHash?.hash
}

async function buildNoteCreates(
	authorId: UserId,
	notes: Array<CreateRemoteNote | EditRemoteNote>,
	remoteTemplateIds: RemoteTemplateId[],
) {
	// highTODO validate author
	const templates = await db
		.selectFrom('template')
		.select(['nook', 'id'])
		.where('id', 'in', remoteTemplateIds.map(fromBase64Url))
		.execute()
	if (templates.length !== remoteTemplateIds.length)
		throwExp('You have an invalid RemoteTemplateId.')
	const noteCreatesAndIds = (
		await Promise.all(
			notes.map(async (n) => {
				const ncs = await toNoteCreates(n, authorId)
				return ncs.map(
					({
						noteCreate,
						remoteIdBase64url,
						remoteTemplateId,
						hashAndRemoteMediaIds,
					}) => {
						const t =
							templates.find(
								(t) => dbIdToBase64Url(t.id) === remoteTemplateId,
							) ?? throwExp()
						return [
							noteCreate,
							[
								[n.localId satisfies NoteId as NoteId, t.nook],
								[remoteIdBase64url, hashAndRemoteMediaIds],
							],
						] as const
					},
				)
			}),
		)
	).flat()
	const noteCreates = noteCreatesAndIds.map((x) => x[0])
	const remoteIdByLocal = new Map(noteCreatesAndIds.map((x) => x[1]))
	return { noteCreates, remoteIdByLocal }
}

export async function insertNotes(authorId: UserId, notes: CreateRemoteNote[]) {
	const remoteTemplateIds = Array.from(
		new Set(notes.flatMap((n) => n.remoteTemplateIds)),
	)
	const { noteCreates, remoteIdByLocal } = await buildNoteCreates(
		authorId,
		notes,
		remoteTemplateIds,
	)
	await db.insertInto('note').values(noteCreates).execute()
	return remoteIdByLocal
}

async function buildTemplateCreates(
	authorId: UserId,
	templates: Array<EditRemoteTemplate | CreateRemoteTemplate>,
) {
	const templateCreatesAndIds = (
		await Promise.all(
			templates.map(async (n) => {
				const tcs = await toTemplateCreates(n, authorId)
				return tcs.map(
					({ templateCreate, remoteIdBase64url, hashAndRemoteMediaIds }) => {
						return [
							templateCreate,
							[
								[
									n.localId satisfies TemplateId as TemplateId,
									templateCreate.nook,
								],
								[remoteIdBase64url, hashAndRemoteMediaIds],
							],
						] as const
					},
				)
			}),
		)
	).flat()
	const templateCreates = templateCreatesAndIds.map((x) => x[0])
	const remoteIdByLocal = new Map(templateCreatesAndIds.map((x) => x[1]))
	return { templateCreates, remoteIdByLocal }
}

export async function insertTemplates(
	authorId: UserId,
	templates: CreateRemoteTemplate[],
) {
	const { templateCreates, remoteIdByLocal } = await buildTemplateCreates(
		authorId,
		templates,
	)
	const subscriptions = templateCreates.map((t) => ({
		templateId: t.id,
		userId: authorId,
	}))
	await db
		.transaction()
		.execute(
			async (tx) =>
				await Promise.all([
					await tx.insertInto('template').values(templateCreates).execute(),
					await tx
						.insertInto('templateSubscriber')
						.values(subscriptions)
						.execute(),
				]),
		)
	return remoteIdByLocal
}

export async function subscribeToTemplate(
	userId: UserId,
	templateId: RemoteTemplateId,
) {
	const templateDbId = fromBase64Url(templateId)
	await db.transaction().execute(
		async (tx) =>
			await Promise.all([
				tx
					.selectFrom('template')
					.select(['id'])
					.where('id', '=', templateDbId)
					.executeTakeFirst()
					.then((n) => {
						if (n == null) throwExp(`Template ${templateId} not found.`)
					}),
				tx
					.updateTable('template')
					.set({
						subscribersCount: (x) => sql`${x.ref('subscribersCount')} + 1`,
					})
					.where('template.id', '=', templateDbId)
					.execute(),
				tx
					.insertInto('templateSubscriber')
					.values({
						userId,
						templateId: templateDbId,
					})
					.execute(),
			]),
	)
}

export async function subscribeToNote(userId: UserId, noteId: RemoteNoteId) {
	const noteDbId = fromBase64Url(noteId)
	await db.transaction().execute(
		async (tx) =>
			await Promise.all([
				tx
					.selectFrom('note')
					.select(['id'])
					.where('id', '=', noteDbId)
					.executeTakeFirst()
					.then((n) => {
						if (n == null) throwExp(`Note ${noteId} not found.`)
					}),
				tx
					.updateTable('note')
					.set({
						subscribersCount: (x) => sql`${x.ref('subscribersCount')} + 1`,
					})
					.where('note.id', '=', noteDbId)
					.execute(),
				tx
					.insertInto('noteSubscriber')
					.values({
						userId,
						noteId: noteDbId,
					})
					.execute(),
			]),
	)
}

async function toNoteCreates(
	n: EditRemoteNote | CreateRemoteNote,
	authorId: UserId,
) {
	const remoteIds =
		'remoteIds' in n
			? new Map(
					Array.from(n.remoteIds).map(([remoteNoteId, remoteTemplateId]) => [
						base64urlToArray(remoteNoteId),
						remoteTemplateId,
					]),
				)
			: new Map(n.remoteTemplateIds.map((rt) => [ulidAsRaw(), rt]))
	return await Promise.all(
		Array.from(remoteIds).map(async (x) => await toNoteCreate(x, n, authorId)),
	)
}

async function toNoteCreate(
	[remoteNoteId, remoteTemplateId]: [Uint8Array, RemoteTemplateId],
	n: EditRemoteNote | CreateRemoteNote,
	authorId: UserId,
) {
	const edited = 'remoteId' in n ? new Date().getTime() / 1000 : undefined
	const remoteIdHex = base16.encode(remoteNoteId) as Hex
	const remoteIdBase64url = arrayToBase64url(remoteNoteId) as RemoteNoteId
	const hashAndRemoteMediaIds: Array<[Base64, RemoteMediaId]> = []
	for (const [field, value] of objEntries(n.fieldValues)) {
		n.fieldValues[field] = await replaceImgSrcs(
			value,
			remoteIdBase64url,
			hashAndRemoteMediaIds,
		)
	}
	const noteCreate = {
		id: unhex(remoteIdHex),
		templateId: fromBase64Url(remoteTemplateId), // highTODO validate
		authorId,
		edited,
		fieldValues: serializeFieldValues(n.fieldValues),
		fts: objEntries(n.fieldValues)
			.map(([, v]) => ftsNormalize(v, true, true, false))
			.concat(n.tags)
			.join(' '),
		tags: serializeTags(n.tags),
		ankiId: n.ankiId,
	} satisfies InsertObject<DB, 'note'>
	return {
		noteCreate,
		remoteIdBase64url,
		remoteTemplateId,
		hashAndRemoteMediaIds,
	}
}

// https://stackoverflow.com/a/73891404
async function replaceAsync(
	string: string,
	regexp: RegExp,
	replacerFunction: (_: RegExpExecArray) => Promise<string>,
) {
	const replacements = await Promise.all(
		Array.from(string.matchAll(regexp), replacerFunction),
	)
	let i = 0
	return string.replace(regexp, () => replacements[i++]!)
}

const imgRegex = new RegExp(escapeRegExp(imgPlaceholder) + `(.{44})`, 'g')
async function replaceImgSrcs(
	value: string,
	remoteIdBase64url: Base64Url,
	hashAndRemoteMediaIds: Array<[Base64, RemoteMediaId]>,
) {
	return await replaceAsync(value, imgRegex, async (array) => {
		const mediaHash = array[1] as Base64
		const remoteMediaId = (await buildPublicToken(
			remoteIdBase64url,
			mediaHash,
			publicMediaSecretBase64,
		)) as RemoteMediaId
		hashAndRemoteMediaIds.push([mediaHash, remoteMediaId])
		return remoteMediaId
	})
}

async function toTemplateCreates(
	n: EditRemoteTemplate | CreateRemoteTemplate,
	authorId: UserId, // highTODO update History. Could History be a compressed column instead of its own table?
) {
	const remoteIds =
		'remoteIds' in n
			? n.remoteIds.map(
					(id) => [base64urlToArray(id), 'undefined_nook' as NookId] as const,
				)
			: n.nooks.map((nook) => [ulidAsRaw(), nook] as const)
	return await Promise.all(
		remoteIds.map(async ([id, nook]) => await toTemplateCreate(n, id, nook)),
	)
}

async function toTemplateCreate(
	n: EditRemoteTemplate | CreateRemoteTemplate,
	remoteId: Uint8Array,
	nook: NookId,
) {
	const edited = 'remoteId' in n ? new Date().getTime() / 1000 : undefined
	const remoteIdHex = base16.encode(remoteId) as Hex
	const remoteIdBase64url = arrayToBase64url(remoteId) as RemoteTemplateId
	const hashAndRemoteMediaIds: Array<[Base64, RemoteMediaId]> = []
	if (n.templateType.tag === 'standard') {
		for (const t of n.templateType.templates) {
			t.front = await replaceImgSrcs(
				t.front,
				remoteIdBase64url,
				hashAndRemoteMediaIds,
			)
			t.back = await replaceImgSrcs(
				t.back,
				remoteIdBase64url,
				hashAndRemoteMediaIds,
			)
		}
	} else {
		n.templateType.template.front = await replaceImgSrcs(
			n.templateType.template.front,
			remoteIdBase64url,
			hashAndRemoteMediaIds,
		)
		n.templateType.template.back = await replaceImgSrcs(
			n.templateType.template.back,
			remoteIdBase64url,
			hashAndRemoteMediaIds,
		)
	}
	const templateCreate = {
		id: unhex(remoteIdHex),
		ankiId: n.ankiId,
		edited,
		name: n.name,
		nook,
		type: serializeTemplateType(n.templateType),
		fields: serializeFields(n.fields),
		css: n.css,
		subscribersCount: 1,
	} satisfies InsertObject<DB, 'template'> & { nook: NookId }
	return {
		templateCreate,
		remoteIdBase64url,
		hashAndRemoteMediaIds,
	}
}

// highTODO property test
function serializeTemplateType(tt: TemplateType) {
	return JSON.stringify(tt)
}

function serializeFields(tt: string[]) {
	return JSON.stringify(tt)
}

function serializeFieldValues(fvs: Record<string, string>) {
	return JSON.stringify(fvs)
}

function serializeTags(tags: string[]) {
	return JSON.stringify(tags)
}

function deserializeTemplateType(tt: string) {
	return JSON.parse(tt) as TemplateType
}

function deserializeFields(tt: string) {
	return JSON.parse(tt) as string[]
}

function deserializeFieldValues(fvs: string) {
	return JSON.parse(fvs) as Record<string, string>
}

function deserializeTags(tags: string) {
	return JSON.parse(tags) as string[]
}

// The point of this type is to cause an error if something is added to Note
// If that happens, you probably want to update the `doUpdateSet` call.
// If not, you an add an exception to the Exclude below.
type OnConflictUpdateNoteSet = {
	[K in keyof Note as Exclude<
		K,
		'id' | 'created' | 'subscribersCount' | 'commentsCount'
	>]: (
		x: ExpressionBuilder<
			OnConflictDatabase<DB, 'note'>,
			OnConflictTables<'note'>
		>,
	) => unknown
}

// The point of this type is to cause an error if something is added to Template
// If that happens, you probably want to update the `doUpdateSet` call.
// If not, you an add an exception to the Exclude below.
type OnConflictUpdateTemplateSet = {
	[K in keyof Template as Exclude<
		K,
		'id' | 'created' | 'subscribersCount' | 'commentsCount' | 'nook'
	>]: (
		x: ExpressionBuilder<
			OnConflictDatabase<DB, 'template'>,
			OnConflictTables<'template'>
		>,
	) => unknown
}

export async function editNotes(authorId: UserId, notes: EditRemoteNote[]) {
	const editNoteIds = notes
		.flatMap((t) => Array.from(t.remoteIds.keys()))
		.map(fromBase64Url)
	const count = await db
		.selectFrom('note')
		.select(db.fn.count<SqliteCount>('id').as('c'))
		.where('id', 'in', editNoteIds)
		.executeTakeFirstOrThrow()
	if (count.c !== notes.length)
		throwExp("At least one of these notes doesn't exist.")
	const remoteTemplateIds = notes.flatMap((t) =>
		Array.from(t.remoteIds.values()),
	)
	const { noteCreates, remoteIdByLocal } = await buildNoteCreates(
		authorId,
		notes,
		remoteTemplateIds,
	)
	// insert into `Note` (`id`, `templateId`, `authorId`, `fieldValues`, `fts`, `tags`)
	// values (UNHEX(?), FROM_BASE64(?), ?, ?, ?, ?)
	// on duplicate key update `templateId` = values(`templateId`), `edited` = values(`edited`), `authorId` = values(`authorId`), `fieldValues` = values(`fieldValues`), `fts` = values(`fts`), `tags` = values(`tags`), `ankiId` = values(`ankiId`)
	await db
		.insertInto('note')
		.values(noteCreates.flat())
		.onConflict((db) =>
			db.doUpdateSet({
				templateId: (x) => x.ref('excluded.templateId'),
				edited: (x) => x.ref('excluded.edited'),
				authorId: (x) => x.ref('excluded.authorId'),
				fieldValues: (x) => x.ref('excluded.fieldValues'),
				fts: (x) => x.ref('excluded.fts'),
				tags: (x) => x.ref('excluded.tags'),
				ankiId: (x) => x.ref('excluded.ankiId'),
			} satisfies OnConflictUpdateNoteSet),
		)
		.execute()
	return remoteIdByLocal
}

export async function editTemplates(
	authorId: UserId,
	templates: EditRemoteTemplate[],
) {
	const editTemplateIds = templates
		.flatMap((t) => t.remoteIds)
		.map(fromBase64Url)
	const count = await db
		.selectFrom('template')
		.select(db.fn.count<SqliteCount>('id').as('c'))
		.where('id', 'in', editTemplateIds)
		.executeTakeFirstOrThrow()
	if (count.c !== editTemplateIds.length)
		throwExp("At least one of these templates doesn't exist.")
	const { templateCreates, remoteIdByLocal } = await buildTemplateCreates(
		authorId,
		templates,
	)
	await db
		.insertInto('template')
		.values(templateCreates.flat())
		// https://stackoverflow.com/a/34866431
		.onConflict((db) =>
			db.doUpdateSet({
				ankiId: (x) => x.ref('excluded.ankiId'),
				edited: (x) => x.ref('excluded.edited'),
				name: (x) => x.ref('excluded.name'),
				type: (x) => x.ref('excluded.type'),
				fields: (x) => x.ref('excluded.fields'),
				css: (x) => x.ref('excluded.css'),
			} satisfies OnConflictUpdateTemplateSet),
		)
		.execute()
	return remoteIdByLocal
}

function unhex(id: Hex): RawBuilder<DbId> {
	return sql<DbId>`UNHEX(${id})`
}

export function fromBase64(id: Base64): RawBuilder<DbId> {
	return sql<DbId>`${base64ToArray(id)}`
}

export function fromBase64Url(id: Base64Url): RawBuilder<DbId> {
	return sql<DbId>`${base64urlToArray(id)}`
}

function mapIdToBase64Url<T>(t: T & { id: DbId }): T & {
	id: Base64Url
} {
	return {
		...t,
		id: arrayToBase64url(new Uint8Array(t.id)),
	}
}

export function dbIdToBase64Url<T extends Base64Url>(dbId: DbId) {
	return arrayToBase64url(new Uint8Array(dbId)) as T
}

export function dbIdToBase64(dbId: DbId) {
	return arrayToBase64(new Uint8Array(dbId))
}

// use with .$call(log)
export function log<T extends Compilable>(qb: T): T {
	console.log('Query : ', qb.compile().query)
	console.log('SQL   : ', qb.compile().sql)
	console.log('Params: ', qb.compile().parameters)
	return qb
}
