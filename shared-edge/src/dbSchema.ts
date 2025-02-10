 
import type { ColumnType } from 'kysely'
import type {
	Brand,
	DbId,
	MediaHash,
	NookId,
} from 'shared/brand'
import type { PeerValidator } from 'shared/domain/user'

export type RawStatus = Brand<number, 'Status'>
export type RawProposalStatus = Brand<number, 'ProposalStatus'>

export type Generated<T> =
	T extends ColumnType<infer S, infer I, infer U>
		? ColumnType<S, I | undefined, U>
		: ColumnType<T, T | undefined, T>

export interface MediaUser {
	mediaHash: DbId
	userId: string
}

export interface Media {
	id: DbId
	entityId: DbId
	hash: MediaHash
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
	status: RawStatus
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
	history: ArrayBuffer | null
	votes: string
	level: number
}

export interface NoteProposal {
	noteId: DbId
	created: Generated<number>
	authorId: string
	delta: ArrayBuffer
	status: RawProposalStatus
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
	history: ArrayBuffer | null
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
	status: RawStatus
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
	history: ArrayBuffer | null
	votes: string
	level: number
}

export interface TemplateProposal {
	templateId: DbId
	created: Generated<number>
	authorId: string
	delta: ArrayBuffer
	status: RawProposalStatus
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
	media: Media
	nook: Nook
	note: Note
	noteComment: NoteComment
	noteProposal: NoteProposal
	noteSubscriber: NoteSubscriber
	post: Post
	postComment: PostComment
	postSubscriber: PostSubscriber
	template: Template
	templateComment: TemplateComment
	templateProposal: TemplateProposal
	templateSubscriber: TemplateSubscriber
	user: User
}
