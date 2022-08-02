import {
  CardTemplateId,
  StencilRevisionId,
  TemplateId,
  TemplateOrdinal,
  UserId,
} from "./ids"

interface Field {
  name: string
  isRightToLeft: boolean
  isSticky: boolean
}

interface CardTemplate {
  id: CardTemplateId
  name: string
  front: string
  back: string
  shortFront: string
  shortBack: string
}

type TemplateType =
  | {
      tag: "standard"
      templates: CardTemplate[]
    }
  | {
      tag: "cloze"
      template: CardTemplate
    }

export interface Template {
  id: TemplateId
  sourceId: StencilRevisionId | null
  specimenSourceId: StencilRevisionId | null
  authorId: UserId
  ordinal: TemplateOrdinal
  name: string // todo limit to 100
  css: string
  fields: Field[]
  createdAt: Date
  modifiedAt: Date
  latexPre: string
  latexPost: string
  templateType: TemplateType
}

export const defaultTemplate: Template = {
  id: "EC2EFBBE-C944-478A-BFC4-023968B38A72" as TemplateId,
  sourceId: null,
  specimenSourceId: null,
  authorId: "FA12DB13-7DA3-4CA1-8C46-86379CC34232" as UserId,
  ordinal: 0 as TemplateOrdinal,
  name: "New Card Template",
  css: "",
  fields: [
    {
      name: "Front",
      isRightToLeft: false,
      isSticky: false,
    },
    {
      name: "Back",
      isRightToLeft: false,
      isSticky: false,
    },
  ],
  createdAt: new Date(),
  modifiedAt: new Date(),
  latexPre: "",
  latexPost: "",
  templateType: {
    tag: "standard",
    templates: [
      {
        id: "ED061BC3-B183-4C55-BE0D-0A820F491CE1" as CardTemplateId,
        name: "Card Template 1",
        front: "{{Front}}",
        back: "{{FrontSide}}<hr id=answer>{{Back}}",
        shortFront: "{{Front}}",
        shortBack: "{{Back}}",
      },
    ],
  },
}
