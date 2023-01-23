export const initSql = [
  `CREATE TABLE IF NOT EXISTS template (
    id BLOB PRIMARY KEY,
    pushId BLOB,
    push INT,
    name TEXT,
    css TEXT,
    fields TEXT,
    created INT,
    modified INT,
    templateType TEXT
);`,
  `CREATE TABLE IF NOT EXISTS note (
    id BLOB PRIMARY KEY,
    templateId BLOB,
    pushId BLOB,
    pushTemplateId BLOB,
    push INT,
    ankiNoteId INT,
    created INT,
    modified INT,
    tags TEXT,
    fieldValues TEXT
);`,
  `SELECT crsql_as_crr('template');`,
  `SELECT crsql_as_crr('note');`,
]

export const jwtCookieName = "__Secure-jwt"

export * from "./wholeDbReplicator.js"
export * from "./wholeDbReplicatorSync.js"
export * from "./kysely.js"
export * from "./convertBinary.js"
export * from "./brand.js"
export * from "./utility.js"
export * from "@scure/base"
