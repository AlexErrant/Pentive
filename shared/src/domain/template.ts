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
export const getDefaultTemplate = (): Template => ({
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
      },
    ],
  },
  remotes: new Map(),
})

export const defaultTemplate = getDefaultTemplate()

export const defaultClozeTemplate: Template = {
  id: "FANOeCfrTeGKVgAAek3FQg" as TemplateId,
  name: "New Template",
  css: "",
  fields: [
    {
      name: "Text",
    },
    {
      name: "Back Extra",
    },
  ],
  created: new Date(),
  updated: new Date(),
  templateType: {
    tag: "cloze",
    template: {
      id: 0 as Ord,
      name: "My Template",
      front: "{{cloze:Text}}",
      back: `{{cloze:Text}}<br>{{Back Extra}}`,
    },
  },
  remotes: new Map(),
}
