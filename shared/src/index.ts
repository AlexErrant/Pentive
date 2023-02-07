export const initSql = [
  `CREATE TABLE IF NOT EXISTS template (
    id BLOB PRIMARY KEY,
    pushId BLOB,
    push INTEGER,
    name TEXT,
    css TEXT,
    fields TEXT,
    created INTEGER,
    modified INTEGER,
    templateType TEXT
) STRICT;`,
  `CREATE TABLE IF NOT EXISTS note (
    id BLOB PRIMARY KEY,
    templateId BLOB,
    pushId BLOB,
    pushTemplateId BLOB,
    push INTEGER,
    ankiNoteId INTEGER,
    created INTEGER,
    modified INTEGER,
    tags TEXT,
    fieldValues TEXT
) STRICT;`,
  `SELECT crsql_as_crr('template');`,
  `SELECT crsql_as_crr('note');`,
]

export const jwtCookieName = "__Secure-jwt"
export const csrfSignatureCookieName = "__Secure-csrf"
export const csrfHeaderName = "x-csrf" // https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#use-of-custom-request-headers

export * from "./wholeDbReplicator.js"
export * from "./wholeDbReplicatorSync.js"
export * from "./kysely.js"
export * from "./convertBinary.js"
export * from "./brand.js"
export * from "./rest.js"
export * from "./utility.js"
export * from "./headers.js"
export * from "@scure/base"
