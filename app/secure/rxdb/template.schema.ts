import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
} from "rxdb"

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
  required: ["id", "name", "created", "modified", "data"],
  indexes: ["name", "created", "modified", "push", "pushId"],
} as const // <- It is important to set 'as const' to preserve the literal type
const schemaTyped = toTypedRxJsonSchema(templateSchemaLiteral)

// aggregate the document type from the schema
export type TemplateDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>

// create the typed RxJsonSchema from the literal typed object.
export const templateSchema: RxJsonSchema<TemplateDocType> =
  templateSchemaLiteral
