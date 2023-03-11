import { z } from "zod"
import {
  NoteId,
  TemplateId,
  RemoteNoteId,
  Ord,
  RemoteTemplateId,
  NookId,
} from "./brand"

export const remoteNoteId = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{22}$/) as unknown as z.Schema<RemoteNoteId>

export const remoteTemplateId = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{22}$/) as unknown as z.Schema<RemoteTemplateId>

const fieldValues = z
  .map(z.string().min(1), z.string())
  .refine((x) => x.size > 0)

export const createRemoteNote = z.object({
  localId: z.string() as unknown as z.Schema<NoteId>,
  remoteTemplateIds: z.array(remoteTemplateId).min(1),
  fieldValues,
  tags: z.array(z.string()),
  ankiId: z.number().positive().optional(),
})
export type CreateRemoteNote = z.infer<typeof createRemoteNote>

export const editRemoteNote = z.object({
  remoteIds: z.map(remoteNoteId, remoteTemplateId).refine((x) => x.size > 0),
  fieldValues,
  tags: z.array(z.string()),
  ankiId: z.number().positive().optional(),
})
export type EditRemoteNote = z.infer<typeof editRemoteNote>

// highTODO are we doing ULIDs, KSUID, or neither?

export const dateSchema = z.preprocess((arg) => {
  if (typeof arg === "string" || arg instanceof Date) return new Date(arg)
}, z.date())

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
  tag: z.literal("standard"),
  templates: z.array(childTemplate).min(1),
})

const cloze = z.object({
  tag: z.literal("cloze"),
  template: childTemplate,
})

export const templateType = z.discriminatedUnion("tag", [standard, cloze])

export type TemplateType = z.infer<typeof templateType>
export type Standard = z.infer<typeof standard>
export type Cloze = z.infer<typeof cloze>

export const nookId = z
  .string()
  .regex(/^[a-z0-9_]{1,22}$/) as unknown as z.Schema<NookId>

export const remoteTemplate = z.object({
  id: remoteTemplateId,
  nook: nookId,
  created: dateSchema,
  modified: dateSchema,
  name: z.string(),
  templateType,
  fields: z.array(z.string()),
  css: z.string(),
  ankiId: z.number().positive().optional(),
})

export type RemoteTemplate = z.infer<typeof remoteTemplate>

const uneditable = {
  id: true,
  nook: true,
  created: true,
  modified: true,
} as const

export const createRemoteTemplate = remoteTemplate.omit(uneditable).extend({
  localId: z.string() as unknown as z.Schema<TemplateId>,
  nooks: z.array(nookId),
})

export type CreateRemoteTemplate = z.infer<typeof createRemoteTemplate>

export const editRemoteTemplate = remoteTemplate.omit(uneditable).extend({
  remoteIds: z.array(remoteTemplateId).min(1),
})

export type EditRemoteTemplate = z.infer<typeof editRemoteTemplate>

export const commentText = z.string().min(1).max(1000)
