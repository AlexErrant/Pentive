import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
} from "rxdb"
export const noteSchemaLiteral = {
  title: "note schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 36, // <- the primary key must have set maxLength
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
    pushTemplateId: {
      type: "string",
      maxLength: 36,
    },
    data: {
      type: "object", // https://gitter.im/pubkey/rxdb?at=5a58d78e83152df26d626cb1
    },
  },
  required: ["id", "created", "modified", "data"],
  indexes: ["created", "modified", "push", "pushId", "pushTemplateId"],
} as const // <- It is important to set 'as const' to preserve the literal type
const schemaTyped = toTypedRxJsonSchema(noteSchemaLiteral)

// aggregate the document type from the schema
export type NoteDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>

// create the typed RxJsonSchema from the literal typed object.
export const noteSchema: RxJsonSchema<NoteDocType> = noteSchemaLiteral
