export const initSql = [
	`CREATE TABLE IF NOT EXISTS cardSetting (
    id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    name TEXT,
    details TEXT
) STRICT;`,
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
	    noteId,
	    field,
	    value,
  );`,
	`CREATE VIRTUAL TABLE IF NOT EXISTS noteFtsTag USING fts5 (
	    tags,
      content=note,
      content_rowid=rowid,
      -- All characters that are not the unit separator are tokenchars 89CDE7EA-EF1B-4054-B381-597EE549CAB4
      tokenize = "unicode61 categories 'L* M* N* P* S* Z* C*' separators '\x1F'"
  );`,
	`CREATE VIRTUAL TABLE IF NOT EXISTS templateNameFts USING fts5 (
	    name,
      content=template,
      content_rowid=rowid
  );`,
	`CREATE VIRTUAL TABLE IF NOT EXISTS cardSettingNameFts USING fts5 (
	    name,
      content=cardSetting,
      content_rowid=rowid
  );`,
	`CREATE VIRTUAL TABLE IF NOT EXISTS noteFtsMedia USING fts5 (
	    media,
      content=note,
      content_rowid=rowid,
      -- All characters that are not the unit separator are tokenchars 89CDE7EA-EF1B-4054-B381-597EE549CAB4
      tokenize = "unicode61 categories 'L* M* N* P* S* Z* C*' separators '\x1F'"
  );`,
	`CREATE VIRTUAL TABLE IF NOT EXISTS noteFtsTagVocab USING fts5vocab(noteFtsTag, instance);`,
	`CREATE VIRTUAL TABLE IF NOT EXISTS noteFtsMediaVocab USING fts5vocab(noteFtsMedia, instance);`,
	`CREATE TRIGGER IF NOT EXISTS note_after_insert AFTER INSERT ON note BEGIN
      INSERT INTO noteFtsFv (noteId, field, value)
        SELECT 
          new.id,
          json_each.key,
          json_each.value
        FROM json_each(new.fieldValues);
      INSERT INTO noteFtsTag  (rowid, tags       ) VALUES (new.rowid, new.tags       );
      INSERT INTO noteFtsMedia(rowid, media      ) VALUES (new.rowid, getMediaIds(new.fieldValues));
   END;`,
	`CREATE TRIGGER IF NOT EXISTS note_after_delete AFTER DELETE ON note BEGIN
     DELETE FROM noteFtsFv WHERE noteId = old.id;
     INSERT INTO noteFtsTag(noteFtsTag, rowid, tags       ) VALUES('delete', old.rowid, old.tags       );
     INSERT INTO noteFtsMedia(noteFtsMedia, rowid, media  ) VALUES('delete', old.rowid, getMediaIds(old.fieldValues));
   END;`,
	`CREATE TRIGGER IF NOT EXISTS note_after_update AFTER UPDATE ON note BEGIN
      REPLACE INTO noteFtsFv (noteId, field, value)
        SELECT 
          new.id,
          json_each.key,
          json_each.value
        FROM json_each(new.fieldValues);
     INSERT INTO noteFtsTag(noteFtsTag, rowid, tags       ) VALUES('delete', old.rowid, old.tags       );
     INSERT INTO noteFtsMedia(noteFtsMedia, rowid, media  ) VALUES('delete', old.rowid, getMediaIds(old.fieldValues));
     INSERT INTO noteFtsTag(rowid, tags       ) VALUES (new.rowid, new.tags       );
     INSERT INTO noteFtsMedia(rowid, media    ) VALUES (new.rowid, getMediaIds(new.fieldValues));
   END;`,
	`CREATE TRIGGER IF NOT EXISTS template_after_insert AFTER INSERT ON template BEGIN
      INSERT INTO templateNameFts (rowid, name) VALUES (new.rowid, new.name);
   END;`,
	`CREATE TRIGGER IF NOT EXISTS template_after_delete AFTER DELETE ON template BEGIN
      INSERT INTO templateNameFts (templateNameFts, rowid, name) VALUES('delete', old.rowid, old.name);
   END;`,
	`CREATE TRIGGER IF NOT EXISTS template_after_update AFTER UPDATE ON template BEGIN
      INSERT INTO templateNameFts (templateNameFts, rowid, name) VALUES('delete', old.rowid, old.name);
      INSERT INTO templateNameFts (rowid, name) VALUES (new.rowid, new.name);
   END;`,
	`CREATE TRIGGER IF NOT EXISTS cardSetting_after_insert AFTER INSERT ON cardSetting BEGIN
      INSERT INTO cardSettingNameFts (rowid, name) VALUES (new.rowid, new.name);
   END;`,
	`CREATE TRIGGER IF NOT EXISTS cardSetting_after_delete AFTER DELETE ON cardSetting BEGIN
      INSERT INTO cardSettingNameFts (cardSettingNameFts, rowid, name) VALUES('delete', old.rowid, old.name);
   END;`,
	`CREATE TRIGGER IF NOT EXISTS cardSetting_after_update AFTER UPDATE ON cardSetting BEGIN
      INSERT INTO cardSettingNameFts (cardSettingNameFts, rowid, name) VALUES('delete', old.rowid, old.name);
      INSERT INTO cardSettingNameFts (rowid, name) VALUES (new.rowid, new.name);
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
    tags TEXT,
    created INTEGER,
    updated INTEGER,
    cardSettingId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    due INTEGER,
    state INTEGER
) STRICT;`,
	`CREATE VIRTUAL TABLE IF NOT EXISTS cardFtsTag USING fts5 (
	    tags,
      content=card,
      content_rowid=rowid,
      -- All characters that are not the unit separator are tokenchars 89CDE7EA-EF1B-4054-B381-597EE549CAB4
      tokenize = "unicode61 categories 'L* M* N* P* S* Z* C*' separators '\x1F'"
  );`,
	`CREATE VIRTUAL TABLE IF NOT EXISTS cardFtsTagVocab USING fts5vocab(cardFtsTag, instance);`,
	`CREATE TRIGGER IF NOT EXISTS card_after_insert AFTER INSERT ON card BEGIN
     INSERT INTO cardFtsTag(rowid, tags       ) VALUES (new.rowid, new.tags       );
   END;`,
	`CREATE TRIGGER IF NOT EXISTS card_after_delete AFTER DELETE ON card BEGIN
     INSERT INTO cardFtsTag(cardFtsTag, rowid, tags       ) VALUES('delete', old.rowid, old.tags       );
   END;`,
	`CREATE TRIGGER IF NOT EXISTS card_after_update AFTER UPDATE ON card BEGIN
     INSERT INTO cardFtsTag(cardFtsTag, rowid, tags       ) VALUES('delete', old.rowid, old.tags       );
     INSERT INTO cardFtsTag(rowid, tags       ) VALUES (new.rowid, new.tags       );
   END;`,
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
	`CREATE TABLE IF NOT EXISTS review (
    id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
    cardId TEXT,
    created INTEGER,
    rating INTEGER,
    kind INTEGER,
    details TEXT
) STRICT;`,
	`PRAGMA temp_store=MEMORY;`, // grep 2790D3E0-F98B-4A95-8910-AC3E87F4F2D3
	`CREATE INDEX IF NOT EXISTS card_noteId_idx on card(noteId);`,
	`CREATE INDEX IF NOT EXISTS card_created_idx on card(created);`,
	`CREATE INDEX IF NOT EXISTS note_templateId_idx on note(templateId);`,
	`CREATE INDEX IF NOT EXISTS card_due_idx on card(due);`,
	`CREATE INDEX IF NOT EXISTS review_cardId_idx on review(cardId);`,
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
export * from './htmlToText.js'
export * from './utility.js'
export * from './headers.js'
export * from './publicToken.js'
export * from './domain/card.js'
export * from './domain/note.js'
export * from './domain/nook.js'
export * from './domain/template.js'
export * from './domain/media.js'
export * from './domain/user.js'
export * from './domain/review.js'
export * from './domain/cardSetting.js'
export * from './result.js'
export * from '@scure/base'
