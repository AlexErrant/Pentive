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
