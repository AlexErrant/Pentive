import { z } from "zod"
import {
  NoteId,
  TemplateId,
  RemoteNoteId,
  ChildTemplateId,
  RemoteTemplateId,
} from "./brand"

export const remoteNoteId = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{22}$/) as unknown as z.Schema<RemoteNoteId>

export const remoteTemplateId = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{22}$/) as unknown as z.Schema<RemoteTemplateId>

export const createRemoteNote = z.object({
  localId: z.string() as unknown as z.Schema<NoteId>,
  remoteTemplateIds: z.array(remoteTemplateId).min(1),
  fieldValues: z.record(z.string()),
  tags: z.array(z.string()),
  ankiId: z.number().positive().optional(),
})
export type CreateRemoteNote = z.infer<typeof createRemoteNote>

export const editRemoteNote = z.object({
  remoteIds: z.record(remoteNoteId, remoteTemplateId),
  fieldValues: z.record(z.string()),
  tags: z.array(z.string()),
  ankiId: z.number().positive().optional(),
})
export type EditRemoteNote = z.infer<typeof editRemoteNote>

// highTODO are we doing ULIDs, KSUID, or neither?

export const dateSchema = z.preprocess((arg) => {
  if (typeof arg === "string" || arg instanceof Date) return new Date(arg)
}, z.date())

export const childTemplate = z.object({
  id: z.string() as unknown as z.Schema<ChildTemplateId>,
  name: z.string(),
  front: z.string(),
  back: z.string(),
  shortFront: z.string().optional(),
  shortBack: z.string().optional(),
})

export type ChildTemplate = z.infer<typeof childTemplate>

export const templateType = z.discriminatedUnion("tag", [
  z.object({
    tag: z.literal("standard"),
    templates: z.array(childTemplate).min(1),
  }),
  z.object({
    tag: z.literal("cloze"),
    template: childTemplate,
  }),
])

export type TemplateType = z.infer<typeof templateType>

export const createRemoteTemplate = z.object({
  localId: z.string() as unknown as z.Schema<TemplateId>,
  name: z.string(),
  nook: z.string(),
  templateType,
  fields: z.array(z.string()),
  css: z.string(),
  ankiId: z.number().positive().optional(),
})

export type CreateRemoteTemplate = z.infer<typeof createRemoteTemplate>

export const editRemoteTemplate = z.object({
  remoteIds: z.array(remoteTemplateId).min(1),
  name: z.string(),
  // nook: z.string(), intentionally omitted
  templateType,
  fields: z.array(z.string()),
  css: z.string(),
  ankiId: z.number().positive().optional(),
})

export type EditRemoteTemplate = z.infer<typeof editRemoteTemplate>

export const remoteTemplate = createRemoteTemplate.extend({
  author: z.string(),
  created: dateSchema,
  modified: dateSchema,
})
