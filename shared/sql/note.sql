CREATE TABLE IF NOT EXISTS noteBase (
  id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  templateId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  ankiNoteId INTEGER,
  created INTEGER,
  updated INTEGER,
  fieldValues TEXT
) STRICT;
CREATE VIEW IF NOT EXISTS note AS
  SELECT
    rowid,
    *,
    (SELECT json_array(tag) FROM notetag WHERE noteId = noteBase.id) AS tags
    FROM noteBase;

CREATE TABLE IF NOT EXISTS noteTag (
  noteId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  tag TEXT,
  PRIMARY KEY (noteId, tag)
);
CREATE VIEW IF NOT EXISTS distinctNoteTag AS
  SELECT MIN(rowid) AS rowid, tag FROM noteTag GROUP BY tag;
CREATE VIRTUAL TABLE IF NOT EXISTS noteTagFts USING fts5 (
  tag,
  content=distinctNoteTag,
  tokenize = "trigram"
);
CREATE VIRTUAL TABLE IF NOT EXISTS noteTagFtsInstance USING fts5vocab(noteTagFts, instance);
CREATE TRIGGER IF NOT EXISTS noteTag_after_insert AFTER INSERT ON noteTag BEGIN
  INSERT INTO noteTagFts(            rowid, tag)
                              SELECT rowid, tag
                              FROM distinctNoteTag
                              WHERE tag = new.tag
                              AND NOT EXISTS (SELECT rowid FROM noteTagFtsInstance WHERE doc = new.rowid LIMIT 1); -- noteTagFts is external content, so `select * from noteTagFts` will query the underlying view, distinctNoteTag. So to figure out if the tag's already in the index, we check the vocab table.
END;
CREATE TRIGGER IF NOT EXISTS noteTag_after_delete AFTER DELETE ON noteTag BEGIN
  INSERT INTO noteTagFts(noteTagFts, rowid, tag) VALUES('delete', old.rowid, old.tag);
  INSERT INTO noteTagFts(            rowid, tag)
                              SELECT rowid, tag
                              FROM distinctNoteTag
                              WHERE tag = old.tag;
END;
CREATE TRIGGER IF NOT EXISTS noteTag_after_update AFTER UPDATE ON noteTag BEGIN
  SELECT RAISE(ABORT, 'Updates not supported - it''s just a join table.');
END;

CREATE TABLE IF NOT EXISTS noteField (
  noteId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  field TEXT,
  PRIMARY KEY (noteId, field)
);
CREATE VIEW IF NOT EXISTS noteFieldValue AS
  SELECT
    noteField.rowid,
    field,
    ftsNormalize(field) as normalizedField,
                 json_extract(fieldValues, '$.' || field)  as value,
    ftsNormalize(json_extract(fieldValues, '$.' || field)) as normalizedValue
  FROM noteField
  JOIN noteBase on noteBase.id = noteField.noteId;
CREATE VIRTUAL TABLE IF NOT EXISTS noteFvFts USING fts5 (
  field,
  value,
  normalizedField,
  normalizedValue,
  content=noteFieldValue,
  content_rowid=rowid,
  tokenize='trigram'
);
CREATE TRIGGER IF NOT EXISTS noteBase_after_insert AFTER INSERT ON noteBase BEGIN
  INSERT INTO noteField (noteId, field)
    SELECT
      new.id,
      json_each.key
    FROM json_each(new.fieldValues);
  INSERT INTO noteFvFts (rowid, field, normalizedField, value, normalizedValue)
    SELECT
      rowid,
      field,
      ftsNormalize(field),
                   json_extract(new.fieldValues, '$.' || field),
      ftsNormalize(json_extract(new.fieldValues, '$.' || field))
    FROM noteField
    WHERE noteField.noteId = new.id;
END;
CREATE TRIGGER IF NOT EXISTS noteBase_after_delete AFTER DELETE ON noteBase BEGIN
  DELETE FROM noteFvFts WHERE rowid IN (SELECT rowid FROM noteField WHERE noteId = old.id);
  DELETE FROM noteField WHERE noteId = old.id;
END;
CREATE TRIGGER IF NOT EXISTS noteBase_after_update AFTER UPDATE ON noteBase BEGIN
  REPLACE INTO noteField (noteId, field)
    SELECT
      new.id,
      json_each.key
    FROM json_each(new.fieldValues);
  REPLACE INTO noteFvFts (rowid, field, normalizedField, value, normalizedValue)
    SELECT
      rowid,
      field,
      ftsNormalize(field),
                    json_extract(new.fieldValues, '$.' || field),
      ftsNormalize(json_extract(new.fieldValues, '$.' || field))
    FROM noteField
    WHERE noteField.noteId = new.id;
END;

CREATE INDEX IF NOT EXISTS noteBase_templateId_idx on noteBase(templateId);
SELECT crsql_as_crr('noteBase');
SELECT crsql_as_crr('noteField');
