import {
  ExtractDocumentTypeFromTypedRxJsonSchema,
  toTypedRxJsonSchema,
} from "rxdb"

export const GRAPHQL_PORT = 10102
export const GRAPHQL_PATH = "/graphql"

/**
 * to demonstrate how auth would work,
 * we use these jwt tokens
 */
export const JWT_PRIVATE_KEY = "qwertyuiopasdfghjklzxcvbnm123456" // H256
export const JWT_BEARER_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJyeGRiIiwiaWF0IjoxNjA0MTg4Njk3LCJ" +
  "leHAiOjIyNjY4NzY2OTcsImF1ZCI6InJ4ZGIuaW5mbyIsInN1YiI6InVzZXJAcnhkYi5pbmZvIn0.hNEC3V4LpkEvGnLeT8hNTXTCZRPpMVDwaltH-8zh4Iw"

export const heroSchema = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100,
    },
    name: {
      type: "string",
      maxLength: 100,
    },
    color: {
      type: "string",
      maxLength: 30,
    },
    updatedAt: {
      type: "number",
      minimum: 0,
      maximum: 1000000000000000,
      multipleOf: 1,
    },
  },
  indexes: ["name", "color", "updatedAt"],
  required: ["id", "color", "updatedAt"],
} as const

const schemaTyped = toTypedRxJsonSchema(heroSchema)
export type Hero = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>

export const graphQLGenerationInput = {
  hero: {
    schema: heroSchema,
    checkpointFields: ["id", "updatedAt"],
    deletedField: "deleted",
    headerFields: ["Authorization"],
  },
} as const
