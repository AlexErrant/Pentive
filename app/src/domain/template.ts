import { ChildTemplateId, RemoteTemplateId, TemplateId } from "./ids"
import { NookId, TemplateType } from "shared"

export interface Field {
  readonly name: string
  readonly rightToLeft?: boolean
  readonly sticky?: boolean
  readonly private?: boolean
}

export interface Template {
  readonly id: TemplateId
  readonly name: string // todo limit to 100
  readonly css: string
  readonly fields: readonly Field[]
  readonly created: Date
  readonly modified: Date
  readonly templateType: TemplateType
  readonly remotes: Map<NookId, RemoteTemplateId | null>
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
        back: `{{FrontSide}}<hr id=answer>{{Back}}<img src="book.jpg" >`, // highTODO nix book.jpg
        shortFront: "{{Front}}",
        shortBack: "{{Back}}",
      },
    ],
  },
  remotes: new Map(),
}
