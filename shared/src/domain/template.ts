import {
  type Ord,
  type RemoteTemplateId,
  type TemplateId,
  type NookId,
} from "../brand.js"
import { type TemplateType } from "../schema.js"

export interface Field {
  name: string
  rightToLeft?: boolean
  sticky?: boolean
  private?: boolean
}

export interface Template {
  id: TemplateId
  name: string // todo limit to 100
  css: string
  fields: Field[]
  created: Date
  updated: Date
  templateType: TemplateType
  remotes: Map<NookId, RemoteTemplateId | null>
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
  updated: new Date(),
  templateType: {
    tag: "standard",
    templates: [
      {
        id: 0 as Ord,
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
