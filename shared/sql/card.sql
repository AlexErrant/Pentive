CREATE TABLE IF NOT EXISTS cardBase (
  id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  ord INTEGER,
  noteId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  tags TEXT,
  created INTEGER,
  updated INTEGER,
  cardSettingId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  due INTEGER,
  state INTEGER
) STRICT;
CREATE VIEW IF NOT EXISTS card AS
  SELECT rowid, * FROM cardBase;
CREATE VIRTUAL TABLE IF NOT EXISTS cardFtsTag USING fts5 (
  tags,
  content=cardBase,
  content_rowid=rowid,
  -- All characters that are not the unit separator are tokenchars 89CDE7EA-EF1B-4054-B381-597EE549CAB4
  tokenize = "unicode61 categories 'L* M* N* P* S* Z* C*' separators '␟'"
);
CREATE VIRTUAL TABLE IF NOT EXISTS cardFtsTagVocab USING fts5vocab(cardFtsTag, instance);
CREATE TRIGGER IF NOT EXISTS cardBase_after_insert AFTER INSERT ON cardBase BEGIN
  INSERT INTO cardFtsTag(rowid, tags       ) VALUES (new.rowid, new.tags       );
END;
CREATE TRIGGER IF NOT EXISTS cardBase_after_delete AFTER DELETE ON cardBase BEGIN
  INSERT INTO cardFtsTag(cardFtsTag, rowid, tags       ) VALUES('delete', old.rowid, old.tags       );
END;
CREATE TRIGGER IF NOT EXISTS cardBase_after_update AFTER UPDATE ON cardBase BEGIN
  INSERT INTO cardFtsTag(cardFtsTag, rowid, tags       ) VALUES('delete', old.rowid, old.tags       );
  INSERT INTO cardFtsTag(rowid, tags       ) VALUES (new.rowid, new.tags       );
END;
CREATE INDEX IF NOT EXISTS cardBase_noteId_idx on cardBase(noteId);
CREATE INDEX IF NOT EXISTS cardBase_created_idx on cardBase(created);
CREATE INDEX IF NOT EXISTS cardBase_due_idx on cardBase(due);
SELECT crsql_as_crr('cardBase');
