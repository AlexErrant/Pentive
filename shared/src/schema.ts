import { z } from 'zod'
import type {
	NoteId,
	TemplateId,
	RemoteNoteId,
	Ord,
	RemoteTemplateId,
	NookId,
	CommentId,
	MediaId,
	RemoteMediaId,
} from './brand'
import { objKeys } from './utility'

// highTODO are we doing ULIDs, KSUID, or neither?

export const dateSchema = z.preprocess((arg) => {
	if (typeof arg === 'string' || arg instanceof Date) return new Date(arg)
}, z.date())

const base64UrlId = z.string().regex(/^[a-zA-Z0-9_-]{22}$/) as unknown
const base64urlHash = z.string().regex(/^[a-zA-Z0-9_-]{43}$/) as unknown
export const remoteNoteId = base64UrlId as z.Schema<RemoteNoteId>
export const remoteTemplateId = base64UrlId as z.Schema<RemoteTemplateId>
export const templateId = base64UrlId as z.Schema<TemplateId>
export const remoteTemplateNoteId = base64UrlId as z.Schema<
	RemoteTemplateId | RemoteNoteId
>
export const commentId = base64UrlId as z.Schema<CommentId>
export const noteId = base64UrlId as z.Schema<NoteId>
export const mediaId = base64UrlId as z.Schema<MediaId>
export const remoteMediaId = base64urlHash as z.Schema<RemoteMediaId>

const fieldValues = z
	.record(z.string().min(1), z.string())
	.refine((x) => objKeys(x).length > 0)

const noteUneditable = {
	id: true,
	templateId: true,
	created: true,
	edited: true,
	nook: true,
	status: true,
} as const

export const nookIdRegex = /^[a-z][a-z0-9]{2,21}$/

export const nookId = z
	.string()
	.regex(nookIdRegex) as unknown as z.Schema<NookId>

const status = z.union([
	z.literal('awaitingMedia'),
	z.literal('draft'),
	z.literal('active'),
	z.literal('archived'),
])
export type Status = z.infer<typeof status>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const proposalStatus = z.union([
	z.literal('awaitingMedia'),
	z.literal('draft'),
	z.literal('open'),
	z.literal('closed'),
	z.literal('merged'),
])
export type ProposalStatus = z.infer<typeof proposalStatus>

export const remoteNote = z.object({
	id: remoteNoteId,
	nook: nookId,
	templateId: remoteTemplateId,
	created: dateSchema,
	edited: dateSchema,
	fieldValues,
	tags: z.array(z.string()),
	ankiId: z.number().positive().optional(),
	status,
})

export type RemoteNote = z.infer<typeof remoteNote>

export const createRemoteNote = remoteNote.omit(noteUneditable).extend({
	localId: z.string() as unknown as z.Schema<NoteId>,
	remoteTemplateIds: z.array(remoteTemplateId).min(1),
})
export type CreateRemoteNote = z.infer<typeof createRemoteNote>

export const editRemoteNote = remoteNote.omit(noteUneditable).extend({
	localId: z.string() as unknown as z.Schema<NoteId>,
	remoteIds: z.map(remoteNoteId, remoteTemplateId).refine((x) => x.size > 0),
})
export type EditRemoteNote = z.infer<typeof editRemoteNote>

export const childTemplate = z.object({
	id: z.number().int() as unknown as z.Schema<Ord>,
	name: z.string(),
	front: z.string(),
	back: z.string(),
	shortFront: z.string().optional(),
	shortBack: z.string().optional(),
})

export type ChildTemplate = z.infer<typeof childTemplate>

const standard = z.object({
	tag: z.literal('standard'),
	templates: z.array(childTemplate).min(1),
})

const cloze = z.object({
	tag: z.literal('cloze'),
	template: childTemplate,
})

export const templateType = z.discriminatedUnion('tag', [standard, cloze])

export type TemplateType = z.infer<typeof templateType>
export type Standard = z.infer<typeof standard>
export type Cloze = z.infer<typeof cloze>

export const remoteTemplate = z.object({
	id: remoteTemplateId,
	nook: nookId,
	created: dateSchema,
	edited: dateSchema,
	name: z.string(),
	templateType,
	fields: z.array(z.string()),
	css: z.string(),
	ankiId: z.number().positive().optional(),
	status,
})

export type RemoteTemplate = z.infer<typeof remoteTemplate>

const templateUneditable = {
	id: true,
	nook: true,
	created: true,
	edited: true,
	status: true,
} as const

export const createRemoteTemplate = remoteTemplate
	.omit(templateUneditable)
	.extend({
		localId: templateId,
		nooks: z.array(nookId),
	})

export type CreateRemoteTemplate = z.infer<typeof createRemoteTemplate>

export const editRemoteTemplate = remoteTemplate
	.omit(templateUneditable)
	.extend({
		remoteIds: z.array(remoteTemplateId).min(1),
		localId: templateId,
	})

export type EditRemoteTemplate = z.infer<typeof editRemoteTemplate>

export const commentText = z.string().min(1).max(1000)
