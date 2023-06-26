export const initSql = [
  `CREATE TABLE IF NOT EXISTS template (
    id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    name TEXT,
    css TEXT,
    fields TEXT,
    created INTEGER,
    updated INTEGER,
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
    ankiNoteId INTEGER,
    created INTEGER,
    updated INTEGER,
    tags TEXT,
    fieldValues TEXT
) STRICT;`,
  `CREATE TABLE IF NOT EXISTS remoteNote (
    localId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    nook TEXT,
    remoteId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    uploadDate INTEGER,
    PRIMARY KEY (localId, nook)
) STRICT;`,
  `CREATE TABLE IF NOT EXISTS card (
    id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    ord INTEGER,
    noteId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    deckIds TEXT,
    created INTEGER,
    updated INTEGER,
    cardSettingId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    due INTEGER,
    state INTEGER
) STRICT;`,
  `CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY, -- should stay TEXT!
    created INTEGER,
    updated INTEGER,
    data BLOB,
    hash BLOB
) STRICT;`,
  `CREATE TABLE IF NOT EXISTS remoteMedia (
    localEntityId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    i INTEGER,
    localMediaId TEXT, -- should stay TEXT!
    uploadDate INTEGER,
    PRIMARY KEY (localEntityId, i)
) STRICT;`,
  `CREATE TABLE IF NOT EXISTS plugin (
    name TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    version TEXT,
    dependencies TEXT,
    created INTEGER,
    updated INTEGER,
    script BLOB
) STRICT;`,
  `SELECT crsql_as_crr('template');`,
  `SELECT crsql_as_crr('remoteTemplate');`,
  `SELECT crsql_as_crr('note');`,
  `SELECT crsql_as_crr('remoteNote');`,
  `SELECT crsql_as_crr('card');`,
  `SELECT crsql_as_crr('media');`,
  `SELECT crsql_as_crr('remoteMedia');`,
  `SELECT crsql_as_crr('plugin');`,
]

// hacky, but better than my previous solution, which was to parse the value, which was slow(er) and fragile.
export const imgPlaceholder = "3Iptw8cmfkd/KLrTw+9swHnzxxVhtDCraYLejUh3"
export const relativeChar = "/"

export * from "./brand.js"
export * from "./schema.js"
export * from "./utility.js"
export * from "./headers.js"
export * from "./publicToken.js"
export * from "./domain/card.js"
export * from "./domain/note.js"
export * from "./domain/template.js"
export * from "./domain/media.js"
export * from "@scure/base"
