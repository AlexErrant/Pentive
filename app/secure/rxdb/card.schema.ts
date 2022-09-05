import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
} from "rxdb"
export const cardSchemaLiteral = {
  title: "card schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 36, // <- the primary key must have set maxLength
    },
    title: {
      type: "string",
      maxLength: 100, // <- string-fields that are used as an index, must set `maxLength`.
    },
    created: {
      type: "string",
      format: "date-time",
      maxLength: 24,
    },
    modified: {
      type: "string",
      format: "date-time",
      maxLength: 24,
    },
    pushId: {
      type: "string",
      maxLength: 36,
    },
    push: {
      type: "integer",
      minimum: 0,
      maximum: 1,
      multipleOf: 1,
    },
    data: {
      type: "object", // https://gitter.im/pubkey/rxdb?at=5a58d78e83152df26d626cb1
    },
  },
  required: ["id", "created", "modified", "data"],
  indexes: ["title", "created", "modified", "push", "pushId"],
} as const // <- It is important to set 'as const' to preserve the literal type
const schemaTyped = toTypedRxJsonSchema(cardSchemaLiteral)

// aggregate the document type from the schema
export type CardDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>

// create the typed RxJsonSchema from the literal typed object.
export const cardSchema: RxJsonSchema<CardDocType> = cardSchemaLiteral
