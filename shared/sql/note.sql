CREATE TABLE IF NOT EXISTS noteBase (
  id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  templateId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  ankiNoteId INTEGER,
  created INTEGER,
  updated INTEGER,
  tags TEXT,
  fieldValues TEXT
) STRICT;
CREATE VIEW IF NOT EXISTS note AS
  SELECT rowid, * FROM noteBase;
CREATE TRIGGER IF NOT EXISTS note_after_insert INSTEAD OF INSERT ON note BEGIN
  INSERT INTO noteBase (id,     templateId,     ankiNoteId,     created,     updated,     tags,     fieldValues)
  VALUES           (new.id, new.templateId, new.ankiNoteId, new.created, new.updated, new.tags, new.fieldValues);
END;
CREATE TRIGGER IF NOT EXISTS note_after_delete INSTEAD OF DELETE ON note BEGIN
  DELETE FROM noteBase WHERE id = old.id;
END;
CREATE TRIGGER IF NOT EXISTS note_after_update INSTEAD OF UPDATE ON note BEGIN
  REPLACE INTO noteBase (id,     templateId,     ankiNoteId,     created,     updated,     tags,     fieldValues)
  VALUES            (new.id, new.templateId, new.ankiNoteId, new.created, new.updated, new.tags, new.fieldValues);
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
CREATE VIRTUAL TABLE IF NOT EXISTS noteFtsTag USING fts5 (
  tags,
  content=noteBase,
  content_rowid=rowid,
  -- All characters that are not the unit separator are tokenchars 89CDE7EA-EF1B-4054-B381-597EE549CAB4
  tokenize = "unicode61 categories 'L* M* N* P* S* Z* C*' separators '␟'"
);
CREATE VIRTUAL TABLE IF NOT EXISTS noteFtsTagVocab USING fts5vocab(noteFtsTag, instance);
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
  INSERT INTO noteFtsTag  (rowid, tags       ) VALUES (new.rowid, new.tags       );
END;
CREATE TRIGGER IF NOT EXISTS noteBase_after_delete AFTER DELETE ON noteBase BEGIN
  DELETE FROM noteFvFts WHERE rowid IN (SELECT rowid FROM noteField WHERE noteId = old.id);
  DELETE FROM noteField WHERE noteId = old.id;
  INSERT INTO noteFtsTag(noteFtsTag, rowid, tags       ) VALUES('delete', old.rowid, old.tags       );
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
  INSERT INTO noteFtsTag(noteFtsTag, rowid, tags       ) VALUES('delete', old.rowid, old.tags       );
  INSERT INTO noteFtsTag(rowid, tags       ) VALUES (new.rowid, new.tags       );
END;
CREATE INDEX IF NOT EXISTS noteBase_templateId_idx on noteBase(templateId);
SELECT crsql_as_crr('noteBase');
SELECT crsql_as_crr('noteField');
