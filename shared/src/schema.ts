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
