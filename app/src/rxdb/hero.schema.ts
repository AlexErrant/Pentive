import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
} from "rxdb"
export const heroSchemaLiteral = {
  title: "hero schema",
  description: "describes a human being",
  version: 0,
  // keyCompression: true,
  primaryKey: "passportId",
  type: "object",
  properties: {
    passportId: {
      type: "string",
      maxLength: 100, // <- the primary key must have set maxLength
    },
    firstName: {
      type: "string",
      maxLength: 100, // <- string-fields that are used as an index, must set `maxLength`.
    },
    lastName: {
      type: "string",
    },
    age: {
      type: "integer",
    },
  },
  required: ["firstName", "lastName", "passportId"],
  indexes: ["firstName"],
} as const // <- It is important to set 'as const' to preserve the literal type
const schemaTyped = toTypedRxJsonSchema(heroSchemaLiteral)

// aggregate the document type from the schema
export type HeroDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof schemaTyped
>

// create the typed RxJsonSchema from the literal typed object.
export const heroSchema: RxJsonSchema<HeroDocType> = heroSchemaLiteral
