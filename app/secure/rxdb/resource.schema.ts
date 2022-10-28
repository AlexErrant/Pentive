import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
} from "rxdb"

export const resourceSchemaLiteral = {
  title: "resource schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 200, // <- the primary key must have set maxLength
    },
    remoteId: {
      type: "string",
      maxLength: 100, // <- string-fields that are used as an index, must set `maxLength`.
    },
    created: {
      type: "string",
      format: "date-time",
      maxLength: 24,
    },
  },
  required: ["id", "remoteId", "created"],
  indexes: ["remoteId", "created"],
  attachments: {},
} as const // <- It is important to set 'as const' to preserve the literal type

const schemaTyped = toTypedRxJsonSchema(resourceSchemaLiteral)

// aggregate the document type from the schema
export type ResourceDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>

// create the typed RxJsonSchema from the literal typed object.
export const resourceSchema: RxJsonSchema<ResourceDocType> =
  resourceSchemaLiteral
