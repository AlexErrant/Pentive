// highTODO remove this
export const JWT_PRIVATE_KEY = "qwertyuiopasdfghjklzxcvbnm123456" // H256
export const JWT_BEARER_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJyeGRiIiwiaWF0IjoxNjA0MTg4Njk3LCJ" +
  "leHAiOjIyNjY4NzY2OTcsImF1ZCI6InJ4ZGIuaW5mbyIsInN1YiI6InVzZXJAcnhkYi5pbmZvIn0.hNEC3V4LpkEvGnLeT8hNTXTCZRPpMVDwaltH-8zh4Iw"

export const initSql = [
  `CREATE TABLE IF NOT EXISTS template (
    id BLOB PRIMARY KEY,
    pushId BLOB,
    push INT,
    name TEXT,
    css TEXT,
    fields TEXT,
    created, -- https://github.com/vlcn-io/cr-sqlite/issues/85
    modified,
    templateType TEXT
);`,
  `CREATE TABLE IF NOT EXISTS note (
    id BLOB PRIMARY KEY,
    templateId BLOB,
    pushId BLOB,
    pushTemplateId BLOB,
    push INT,
    ankiNoteId INT,
    created, -- https://github.com/vlcn-io/cr-sqlite/issues/85
    modified,
    tags TEXT,
    fieldValues TEXT
);`,
  `SELECT crsql_as_crr('template');`,
  `SELECT crsql_as_crr('note');`,
]

export * from "./wholeDbReplicator.js"
export * from "./kysely.js"
export * from "./convertBinary.js"
export * from "./brand.js"
export * from "./utility.js"
