import { z } from "zod"
import { dateSchema, id } from "./core"

export const createRemoteTemplate = z.object({
  id,
  name: z.string(),
  nook: z.string(),
  templateType: z.literal("standard").or(z.literal("cloze")),
  fields: z.array(z.string()),
  css: z.string(),
  childTemplates: z.string(),
  ankiId: z.number().positive().optional(),
})

export type CreateRemoteTemplate = z.infer<typeof createRemoteTemplate>

export const remoteTemplate = createRemoteTemplate.extend({
  created: dateSchema,
  modified: dateSchema,
})
