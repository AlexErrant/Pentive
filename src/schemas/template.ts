import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
} from "rxdb"

import {
  CardTemplateId,
  StencilRevisionId,
  TemplateId,
  TemplateOrdinal,
  UserId,
} from "../domain/ids"

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

export const templateSchemaLiteral = {
  title: "template schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 36, // <- the primary key must have set maxLength
    },
    name: {
      type: "string",
      maxLength: 100, // <- string-fields that are used as an index, must set `maxLength`.
    },
    data: {
      type: "object", // https://gitter.im/pubkey/rxdb?at=5a58d78e83152df26d626cb1
    },
  },
  required: ["id", "name", "data"],
  indexes: ["name"],
} as const // <- It is important to set 'as const' to preserve the literal type
const schemaTyped = toTypedRxJsonSchema(templateSchemaLiteral)

// aggregate the document type from the schema
export type TemplateDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>

// create the typed RxJsonSchema from the literal typed object.
export const templateSchema: RxJsonSchema<TemplateDocType> =
  templateSchemaLiteral
