CREATE TABLE IF NOT EXISTS cardBase (
  id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  ord INTEGER,
  noteId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  created INTEGER,
  updated INTEGER,
  cardSettingId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  due INTEGER,
  state INTEGER
) STRICT;
CREATE VIEW IF NOT EXISTS card AS
  SELECT
    rowid,
    *,
    (SELECT json_group_array(tag) FROM cardtag WHERE cardId = cardBase.id) AS tags
    FROM cardBase;

CREATE TABLE IF NOT EXISTS cardTag (
  cardId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  tag TEXT,
  PRIMARY KEY (cardId, tag)
);
CREATE VIEW IF NOT EXISTS distinctCardTag AS
  SELECT MIN(rowid) AS rowid, tag FROM cardTag GROUP BY tag;
CREATE VIRTUAL TABLE IF NOT EXISTS cardTagFts USING fts5 (
  tag,
  content=distinctCardTag,
  tokenize = "trigram"
);
CREATE VIRTUAL TABLE IF NOT EXISTS cardTagFtsInstance USING fts5vocab(cardTagFts, instance);
CREATE TRIGGER IF NOT EXISTS cardTag_after_insert AFTER INSERT ON cardTag BEGIN
  INSERT INTO cardTagFts(            rowid, tag)
                              SELECT rowid, tag
                              FROM distinctCardTag
                              WHERE tag = new.tag
                              AND NOT EXISTS (SELECT rowid FROM cardTagFtsInstance WHERE doc = new.rowid LIMIT 1); -- cardTagFts is external content, so `select * from cardTagFts` will query the underlying view, distinctCardTag. So to figure out if the tag's already in the index, we check the vocab table.
END;
CREATE TRIGGER IF NOT EXISTS cardTag_after_delete AFTER DELETE ON cardTag BEGIN
  INSERT INTO cardTagFts(cardTagFts, rowid, tag) VALUES('delete', old.rowid, old.tag);
  INSERT INTO cardTagFts(            rowid, tag)
                              SELECT rowid, tag
                              FROM distinctCardTag
                              WHERE tag = old.tag;
END;
CREATE TRIGGER IF NOT EXISTS cardTag_after_update AFTER UPDATE ON cardTag BEGIN
  SELECT RAISE(ABORT, 'Updates not supported - it''s just a join table.');
END;

CREATE INDEX IF NOT EXISTS cardBase_noteId_idx on cardBase(noteId);
CREATE INDEX IF NOT EXISTS cardBase_created_idx on cardBase(created);
CREATE INDEX IF NOT EXISTS cardBase_due_idx on cardBase(due);
SELECT crsql_as_crr('cardBase');
