import { ChildTemplateId, RemoteTemplateId, TemplateId } from "./ids"

export interface Field {
  readonly name: string
  readonly rightToLeft?: boolean
  readonly sticky?: boolean
  readonly private?: boolean
}

export interface ChildTemplate {
  readonly id: ChildTemplateId
  readonly name: string
  readonly front: string
  readonly back: string
  readonly shortFront?: string
  readonly shortBack?: string
}

export type TemplateType =
  | {
      readonly tag: "standard"
      readonly templates: readonly ChildTemplate[]
    }
  | {
      readonly tag: "cloze"
      readonly template: ChildTemplate
    }

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
