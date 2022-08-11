import { ChildTemplateId, StencilRevisionId, TemplateId } from "./ids"

interface Field {
  name: string
  rightToLeft?: boolean
  sticky?: boolean
  private?: boolean
}

interface ChildTemplate {
  id: ChildTemplateId
  name: string
  front: string
  back: string
  shortFront?: string
  shortBack?: string
}

type TemplateType =
  | {
      tag: "standard"
      templates: ChildTemplate[]
    }
  | {
      tag: "cloze"
      template: ChildTemplate
    }

export interface Template {
  id: TemplateId
  sourceId?: StencilRevisionId
  specimenSourceId?: StencilRevisionId
  name: string // todo limit to 100
  css: string
  fields: Field[]
  created: Date
  modified: Date
  latexPre?: string
  latexPost?: string
  templateType: TemplateType
}

export const defaultTemplate: Template = {
  id: "EC2EFBBE-C944-478A-BFC4-023968B38A72" as TemplateId,
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
        id: "ED061BC3-B183-4C55-BE0D-0A820F491CE1" as ChildTemplateId,
        name: "My Template",
        front: "{{Front}}",
        back: "{{FrontSide}}<hr id=answer>{{Back}}",
        shortFront: "{{Front}}",
        shortBack: "{{Back}}",
      },
    ],
  },
}
