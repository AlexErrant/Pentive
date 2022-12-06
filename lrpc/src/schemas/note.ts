import { z } from "zod"
import { dateSchema, id } from "./core.js"

export const createRemoteNote = z.object({
  id,
  templateId: id,
  nook: z.string(),
  fieldValues: z.record(z.string()),
  tags: z.array(z.string()),
  ankiId: z.number().positive().optional(),
})

export type CreateRemoteNote = z.infer<typeof createRemoteNote>

export const remoteNote = createRemoteNote.extend({
  author: z.string(),
  created: dateSchema,
  modified: dateSchema,
})
