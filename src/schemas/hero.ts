import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema,
} from "rxdb"
export const heroSchemaLiteral = {
  title: "hero schema",
  description: "describes a human being",
  version: 0,
  keyCompression: true,
  primaryKey: "passportId",
  type: "object",
  properties: {
    passportId: {
      type: "string",
    },
    firstName: {
      type: "string",
    },
    lastName: {
      type: "string",
    },
  },
  required: ["firstName", "lastName", "passportId"],
  indexes: ["firstName"],
} as const // <- It is important to set 'as const' to preserve the literal type
const schemaTyped = toTypedRxJsonSchema(heroSchemaLiteral)

// aggregate the document type from the schema
type HeroDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>

// create the typed RxJsonSchema from the literal typed object.
const heroSchema: RxJsonSchema<HeroDocType> = heroSchemaLiteral
