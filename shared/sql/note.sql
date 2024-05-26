CREATE TABLE IF NOT EXISTS noteBase (
  id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  templateId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  ankiNoteId INTEGER,
  created INTEGER,
  updated INTEGER
) STRICT;
CREATE VIEW IF NOT EXISTS note AS
  SELECT
    rowid,
    *,
    (SELECT json_array(tag) FROM notetag WHERE noteId = noteBase.id) AS tags,
    (SELECT json_group_object(field, value) FROM noteFieldValue WHERE noteId = noteBase.id) AS fieldValues
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

CREATE TABLE IF NOT EXISTS noteFieldValue (
  noteId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  field TEXT,
  value TEXT,
  PRIMARY KEY (noteId, field)
);
CREATE VIEW IF NOT EXISTS distinctNoteField AS
  SELECT
    MIN(rowid) AS rowid,
    field,
    ftsNormalize(field) AS normalized
  FROM noteFieldValue
  GROUP BY field;
CREATE VIEW IF NOT EXISTS noteValueFtsView AS
  SELECT
    rowid,
    value,
    ftsNormalize(value) AS normalized
  FROM noteFieldValue;
CREATE VIRTUAL TABLE IF NOT EXISTS noteFieldFts USING fts5 (
  field,
  normalized,
  content=distinctNoteField,
  tokenize = "trigram"
);
CREATE VIRTUAL TABLE IF NOT EXISTS noteValueFts USING fts5 (
  value,
  normalized,
  content=noteValueFtsView,
  tokenize = "trigram"
);
CREATE VIRTUAL TABLE IF NOT EXISTS noteFieldFtsInstance USING fts5vocab(noteFieldFts, instance);
CREATE TRIGGER IF NOT EXISTS noteFieldValue_after_insert AFTER INSERT ON noteFieldValue BEGIN
  INSERT INTO noteFieldFts(              rowid, field,         normalized)
                                  SELECT rowid, field, ftsNormalize(field)
                                  FROM distinctNoteField
                                  WHERE field = new.field
                                  AND NOT EXISTS (SELECT rowid FROM noteFieldFtsInstance WHERE doc = new.rowid LIMIT 1); -- noteFieldFts is external content, so `select * from noteFieldFts` will query the underlying view, distinctNoteField. So to figure out if the field's already in the index, we check the vocab table.
  INSERT INTO noteValueFts(    rowid,     value,              normalized)
                    VALUES(new.rowid, new.value, ftsNormalize(new.value));
END;
CREATE TRIGGER IF NOT EXISTS noteFieldValue_after_delete AFTER DELETE ON noteFieldValue BEGIN
  INSERT INTO noteFieldFts(noteFieldFts, rowid, field) VALUES('delete', old.rowid, old.field);
  INSERT INTO noteFieldFts(              rowid, field)
                                  SELECT rowid, field
                                  FROM distinctNoteField
                                  WHERE field = old.field;
  DELETE FROM noteValueFts WHERE rowid = old.rowid;
END;
CREATE TRIGGER IF NOT EXISTS noteFieldValue_after_update AFTER UPDATE ON noteFieldValue BEGIN
  DELETE FROM noteValueFts WHERE rowid = old.rowid;
  INSERT INTO noteValueFts(    rowid,     value,              normalized)
                    VALUES(new.rowid, new.value, ftsNormalize(new.value));
END;

CREATE INDEX IF NOT EXISTS noteBase_templateId_idx on noteBase(templateId);
SELECT crsql_as_crr('noteBase');
SELECT crsql_as_crr('noteTag');
SELECT crsql_as_crr('noteFieldValue');
