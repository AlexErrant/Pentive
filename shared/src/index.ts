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
	`CREATE VIRTUAL TABLE IF NOT EXISTS noteFtsFv USING fts5 (
	    id,
	    fieldValues
  );`,
	`CREATE VIRTUAL TABLE IF NOT EXISTS noteFtsTag USING fts5 (
	    id,
	    tags,
      -- All characters that are not the unit separator are tokenchars 89CDE7EA-EF1B-4054-B381-597EE549CAB4
      tokenize = "unicode61 categories 'L* M* N* P* S* Z* C*' separators '\x1F'"
  );`,
	`CREATE TRIGGER IF NOT EXISTS note_after_insert AFTER INSERT ON note BEGIN
     INSERT INTO noteFtsFv (id, fieldValues) VALUES (new.id, new.fieldValues);
     INSERT INTO noteFtsTag(id, tags       ) VALUES (new.id, new.tags       );
   END;`,
	`CREATE TRIGGER IF NOT EXISTS note_after_delete AFTER DELETE ON note BEGIN
     INSERT INTO noteFtsFv (noteFtsFv , id, fieldValues) VALUES('delete', old.id, old.fieldValues);
     INSERT INTO noteFtsTag(noteFtsTag, id, tags       ) VALUES('delete', old.id, old.tags       );
   END;`,
	`CREATE TRIGGER IF NOT EXISTS note_after_update AFTER UPDATE ON note BEGIN
     INSERT INTO noteFtsFv (noteFtsFv , id, fieldValues) VALUES('delete', old.id, old.fieldValues);
     INSERT INTO noteFtsTag(noteFtsTag, id, tags       ) VALUES('delete', old.id, old.tags       );
     INSERT INTO noteFtsFv (id, fieldValues) VALUES (new.id, new.fieldValues);
     INSERT INTO noteFtsTag(id, tags       ) VALUES (new.id, new.tags       );
   END;`,
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
	`CREATE INDEX IF NOT EXISTS card_noteId_idx on card(noteId);`,
	`CREATE INDEX IF NOT EXISTS card_created_idx on card(created);`,
	`CREATE INDEX IF NOT EXISTS card_due_idx on card(due);`,
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
export const imgPlaceholder = '3Iptw8cmfkd/KLrTw+9swHnzxxVhtDCraYLejUh3'
export const relativeChar = '/'

export * from './brand.js'
export * from './schema.js'
export * from './utility.js'
export * from './headers.js'
export * from './publicToken.js'
export * from './domain/card.js'
export * from './domain/note.js'
export * from './domain/nook.js'
export * from './domain/template.js'
export * from './domain/media.js'
export * from './domain/user.js'
export * from './result.js'
export * from '@scure/base'
