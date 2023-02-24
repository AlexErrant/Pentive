import { z } from "zod"
import { ChildTemplateId, RemoteTemplateId, TemplateId } from "./ids"

export interface Field {
  readonly name: string
  readonly rightToLeft?: boolean
  readonly sticky?: boolean
  readonly private?: boolean
}

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

export interface Template {
  readonly id: TemplateId
  readonly remoteId?: RemoteTemplateId
  readonly push?: true
  readonly name: string // todo limit to 100
  readonly css: string
  readonly fields: readonly Field[]
  readonly created: Date
  readonly modified: Date
  readonly templateType: TemplateType
}

export const defaultTemplate: Template = {
  id: "fanOeCfrTeGKVgAAek3FQg" as TemplateId,
  name: "New Template",
  css: "",
  fields: [
    {
      name: "Front",
    },
    {
      name: "Back",
    },
  ],
  created: new Date(),
  modified: new Date(),
  templateType: {
    tag: "standard",
    templates: [
      {
        id: "lt31LyaTR3qBMQAAsZdhdg" as ChildTemplateId,
        name: "My Template",
        front: "{{Front}}",
        back: "{{FrontSide}}<hr id=answer>{{Back}}",
        shortFront: "{{Front}}",
        shortBack: "{{Back}}",
      },
    ],
  },
}
