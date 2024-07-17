CREATE TABLE IF NOT EXISTS cardBase (
  id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  ord INTEGER,
  noteId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  created INTEGER,
  edited INTEGER,
  lapses INTEGER,
  repCount INTEGER,
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
CREATE VIEW IF NOT EXISTS cardWithTagCount AS
  SELECT
    *,
    count(cardTag.tag) as tagCount
  FROM card
  LEFT JOIN cardTag on cardTag.cardId = card.id
  GROUP BY card.rowid;

CREATE TABLE IF NOT EXISTS cardTag (
  cardId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  tag TEXT,
  PRIMARY KEY (cardId, tag)
);
CREATE VIEW IF NOT EXISTS distinctCardTag AS
  SELECT
    MIN(rowid) AS rowid,
    tag,
    ftsNormalize(tag, 1, 1, 0) as normalized
  FROM cardTag GROUP BY tag;
CREATE VIRTUAL TABLE IF NOT EXISTS cardTagFts USING fts5 (
  tag,
  normalized,
  content=distinctCardTag,
  tokenize = "trigram"
);
CREATE VIRTUAL TABLE IF NOT EXISTS cardTagFtsInstance USING fts5vocab(cardTagFts, instance);
CREATE TRIGGER IF NOT EXISTS cardTag_after_insert AFTER INSERT ON cardTag BEGIN
  INSERT INTO cardTagFts(            rowid, tag, normalized)
                              SELECT rowid, tag, normalized
                              FROM distinctCardTag
                              WHERE tag = new.tag
                              AND NOT EXISTS (SELECT rowid FROM cardTagFtsInstance WHERE doc = new.rowid); -- cardTagFts is external content, so `select * from cardTagFts` will query the underlying view, distinctCardTag. So to figure out if the tag's already in the index, we check the vocab table.
END;
CREATE TRIGGER IF NOT EXISTS cardTag_after_delete AFTER DELETE ON cardTag BEGIN
  DELETE FROM cardTagFts WHERE rowid = old.rowid;
  INSERT INTO cardTagFts(            rowid, tag, normalized)
                              SELECT rowid, tag, normalized
                              FROM distinctCardTag
                              WHERE tag = old.tag;
END;
CREATE TRIGGER IF NOT EXISTS cardTag_after_update AFTER UPDATE ON cardTag BEGIN
  SELECT RAISE(ABORT, 'Updates not supported - it''s just a join table.');
END;

CREATE INDEX IF NOT EXISTS cardBase_noteId_idx on cardBase(noteId);
CREATE INDEX IF NOT EXISTS cardBase_created_idx on cardBase(created);
CREATE INDEX IF NOT EXISTS cardBase_due_idx on cardBase(due);
CREATE INDEX IF NOT EXISTS cardTag_tag_idx on cardTag(tag);
SELECT crsql_as_crr('cardBase');
