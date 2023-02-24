import { z } from "zod"
import { NoteId, TemplateId, RemoteNoteId } from "./brand"

export const createRemoteNote = z.object({
  localId: z.string() as unknown as z.Schema<NoteId>,
  templateId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{22}$/) as unknown as z.Schema<TemplateId>,
  fieldValues: z.record(z.string()),
  tags: z.array(z.string()),
  ankiId: z.number().positive().optional(),
})
export type CreateRemoteNote = z.infer<typeof createRemoteNote>

export const editRemoteNote = z.object({
  remoteId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{22}$/) as unknown as z.Schema<RemoteNoteId>,
  templateId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{22}$/) as unknown as z.Schema<TemplateId>,
  fieldValues: z.record(z.string()),
  tags: z.array(z.string()),
  ankiId: z.number().positive().optional(),
})
export type EditRemoteNote = z.infer<typeof editRemoteNote>

export const id = z.string() // highTODO are we doing ULIDs, KSUID, or neither?

export const remoteNoteId = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{22}$/) as unknown as z.Schema<RemoteNoteId>

export const dateSchema = z.preprocess((arg) => {
  if (typeof arg === "string" || arg instanceof Date) return new Date(arg)
}, z.date())

export const createRemoteTemplate = z.object({
  id,
  name: z.string(),
  nook: z.string(),
  templateType: z.literal("standard").or(z.literal("cloze")),
  fields: z.array(z.string()),
  css: z.string(),
  ankiId: z.number().positive().optional(),
})

export type CreateRemoteTemplate = z.infer<typeof createRemoteTemplate>

export const remoteTemplate = createRemoteTemplate.extend({
  author: z.string(),
  created: dateSchema,
  modified: dateSchema,
})
