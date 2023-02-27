export const initSql = [
  `CREATE TABLE IF NOT EXISTS template (
    id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    name TEXT,
    css TEXT,
    fields TEXT,
    created INTEGER,
    modified INTEGER,
    templateType TEXT,
    ankiId INTEGER
) STRICT;`,
  `CREATE TABLE IF NOT EXISTS remoteTemplate (
    localId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    nook TEXT,
    remoteId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    uploadDate INTEGER,
    PRIMARY KEY (localId, nook)
) STRICT;`,
  `CREATE TABLE IF NOT EXISTS note (
    id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    templateId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    remoteId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    pushTemplateId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    push INTEGER,
    ankiNoteId INTEGER,
    created INTEGER,
    modified INTEGER,
    tags TEXT,
    fieldValues TEXT
) STRICT;`,
  `CREATE TABLE IF NOT EXISTS card (
    id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    pointer TEXT,
    noteId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    deckIds TEXT,
    created INTEGER,
    modified INTEGER,
    cardSettingId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    due INTEGER,
    state INTEGER
) STRICT;`,
  `CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY, -- should stay TEXT!
    created INTEGER,
    modified INTEGER,
    data BLOB
) STRICT;`,
  `CREATE TABLE IF NOT EXISTS remoteMedia (
    localEntityId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    i INTEGER,
    localMediaId TEXT, -- should stay TEXT!
    uploadDate INTEGER,
    PRIMARY KEY (localEntityId, i)
) STRICT;`,
  `CREATE TABLE IF NOT EXISTS plugin (
    id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    name TEXT,
    created INTEGER,
    modified INTEGER,
    script BLOB
) STRICT;`,
  `SELECT crsql_as_crr('template');`,
  `SELECT crsql_as_crr('remoteTemplate');`,
  `SELECT crsql_as_crr('note');`,
  `SELECT crsql_as_crr('card');`,
  `SELECT crsql_as_crr('media');`,
  `SELECT crsql_as_crr('remoteMedia');`,
  `SELECT crsql_as_crr('plugin');`,
]

export const jwtCookieName = "__Secure-jwt"
export const csrfSignatureCookieName = "__Secure-csrf"
export const csrfHeaderName = "x-csrf" // https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#use-of-custom-request-headers

export * from "./wholeDbReplicator.js"
export * from "./wholeDbReplicatorSync.js"
export * from "./kysely.js"
export * from "./convertBinary.js"
export * from "./brand.js"
export * from "./schema.js"
export * from "./utility.js"
export * from "./headers.js"
export * from "@scure/base"
