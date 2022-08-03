import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
} from "rxdb"
export const exampleSchemaLiteral = {
  title: "example schema",
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
    data: {
      type: "object", // https://gitter.im/pubkey/rxdb?at=5a58d78e83152df26d626cb1
    },
  },
  required: ["id", "title", "created", "modified", "data"],
  indexes: ["title", "created", "modified"],
} as const // <- It is important to set 'as const' to preserve the literal type
const schemaTyped = toTypedRxJsonSchema(exampleSchemaLiteral)

// aggregate the document type from the schema
export type ExampleDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>

// create the typed RxJsonSchema from the literal typed object.
export const exampleSchema: RxJsonSchema<ExampleDocType> = exampleSchemaLiteral
