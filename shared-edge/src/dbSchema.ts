/* eslint-disable @typescript-eslint/naming-convention */
import type { ColumnType } from 'kysely'
import { type DbId, type MediaHash, type NookId } from 'shared/brand'
import { type PeerValidator } from 'shared/domain/user'

export type Generated<T> =
	T extends ColumnType<infer S, infer I, infer U>
		? ColumnType<S, I | undefined, U>
		: ColumnType<T, T | undefined, T>

export interface MediaUser {
	mediaHash: DbId
	userId: string
}

export interface MediaEntity {
	entityId: DbId // composite pk
	i: number //      composite pk
	mediaHash: MediaHash
}

export interface Nook {
	id: string
	created: Generated<number>
	moderators: string
	sidebar: string
	description: string
	approved: string | null
	type: number
}

export interface Note {
	id: DbId
	templateId: DbId
	created: Generated<number>
	edited: Generated<number>
	authorId: string
	fieldValues: string
	fts: string
	tags: string
	ankiId: number | null
	subscribersCount: Generated<number>
	commentsCount: Generated<number>
}

export interface NoteComment {
	id: DbId
	parentId: DbId | null
	noteId: DbId
	created: Generated<number>
	edited: Generated<number>
	text: string
	authorId: string
	history: string | null
	votes: string
	level: number
}

export interface NoteHistory {
	noteId: DbId
	created: Generated<number>
	templateId: DbId | null
	fieldValues: string
	tags: string
}

export interface NoteSubscriber {
	noteId: DbId
	userId: string
	til: Generated<number>
}

export interface Post {
	id: DbId
	title: string
	text: string
	nook: string
	authorId: string
}

export interface PostComment {
	id: DbId
	parentId: DbId | null
	postId: DbId
	created: Generated<number>
	edited: Generated<number>
	text: string
	authorId: string
	history: string | null
	votes: string
	level: number
}

export interface PostSubscriber {
	postId: DbId
	userId: string
	til: Generated<number>
}

export interface Template {
	id: DbId
	created: Generated<number>
	edited: Generated<number>
	name: string
	nook: NookId
	type: string
	fields: string
	css: string
	ankiId: number | null
	subscribersCount: Generated<number>
	commentsCount: Generated<number>
}

export interface TemplateComment {
	id: DbId
	parentId: DbId | null
	templateId: DbId
	created: Generated<number>
	edited: Generated<number>
	text: string
	authorId: string
	history: string | null
	votes: string
	level: number
}

export interface TemplateHistory {
	templateId: DbId
	created: Generated<number>
	name: string | null
	authorId: string | null
	type: string | null
	fields: string | null
	css: string | null
}

export interface TemplateSubscriber {
	templateId: DbId
	userId: string
	til: Generated<number>
}

export interface User {
	id: string
	email: string
	peer: PeerValidator | null
	created: Generated<number>
}

export interface DB {
	media_User: MediaUser
	media_Entity: MediaEntity
	nook: Nook
	note: Note
	noteComment: NoteComment
	noteHistory: NoteHistory
	noteSubscriber: NoteSubscriber
	post: Post
	postComment: PostComment
	postSubscriber: PostSubscriber
	template: Template
	templateComment: TemplateComment
	templateHistory: TemplateHistory
	templateSubscriber: TemplateSubscriber
	user: User
}
