import { z } from 'zod'
import {
	type NoteId,
	type TemplateId,
	type RemoteNoteId,
	type Ord,
	type RemoteTemplateId,
	type NookId,
	type CommentId,
	type MediaId,
} from './brand'
import { objKeys } from './utility'

// highTODO are we doing ULIDs, KSUID, or neither?

export const dateSchema = z.preprocess((arg) => {
	if (typeof arg === 'string' || arg instanceof Date) return new Date(arg)
}, z.date())

const base64UrlId = z.string().regex(/^[a-zA-Z0-9_-]{22}$/) as unknown
export const remoteNoteId = base64UrlId as z.Schema<RemoteNoteId>
export const remoteTemplateId = base64UrlId as z.Schema<RemoteTemplateId>
export const commentId = base64UrlId as z.Schema<CommentId>
export const noteId = base64UrlId as z.Schema<NoteId>
export const mediaId = base64UrlId as z.Schema<MediaId>

const fieldValues = z
	.record(z.string().min(1), z.string())
	.refine((x) => objKeys(x).length > 0)

const noteUneditable = {
	id: true,
	templateId: true,
	created: true,
	edited: true,
	nook: true,
} as const

export const nookIdRegex = /^[a-z][a-z0-9]{2,21}$/

export const nookId = z
	.string()
	.regex(nookIdRegex) as unknown as z.Schema<NookId>

export const remoteNote = z.object({
	id: remoteNoteId,
	nook: nookId,
	templateId: remoteTemplateId,
	created: dateSchema,
	edited: dateSchema,
	fieldValues,
	tags: z.array(z.string()),
	ankiId: z.number().positive().optional(),
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
})

export type RemoteTemplate = z.infer<typeof remoteTemplate>

const templateUneditable = {
	id: true,
	nook: true,
	created: true,
	edited: true,
} as const

export const createRemoteTemplate = remoteTemplate
	.omit(templateUneditable)
	.extend({
		localId: z.string() as unknown as z.Schema<TemplateId>,
		nooks: z.array(nookId),
	})

export type CreateRemoteTemplate = z.infer<typeof createRemoteTemplate>

export const editRemoteTemplate = remoteTemplate
	.omit(templateUneditable)
	.extend({
		remoteIds: z.array(remoteTemplateId).min(1),
		localId: z.string() as unknown as z.Schema<TemplateId>,
	})

export type EditRemoteTemplate = z.infer<typeof editRemoteTemplate>

export const commentText = z.string().min(1).max(1000)
