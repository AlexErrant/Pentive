CREATE TABLE IF NOT EXISTS setting (
  id TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  key TEXT,
  value,
  PRIMARY KEY (id, key)
);
CREATE VIEW IF NOT EXISTS cardSettingName AS
  SELECT rowid, value as name, ftsNormalize(value, 1, 1, 0) AS normalized
  FROM setting
  WHERE key = 'name' AND id <> ''; -- 5A7C82EC-D401-4250-896C-DDB0FBE9107E
CREATE TABLE IF NOT EXISTS template (
  id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  name TEXT,
  css TEXT,
  fields TEXT,
  created INTEGER,
  edited INTEGER,
  templateType TEXT,
  ankiId INTEGER
) STRICT;
CREATE VIEW IF NOT EXISTS templateName AS
  SELECT rowid, name, ftsNormalize(name, 1, 1, 0) AS normalized FROM template;
CREATE TABLE IF NOT EXISTS remoteTemplate (
  localId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  nook TEXT,
  remoteId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  uploadDate INTEGER,
  PRIMARY KEY (localId, nook)
) STRICT;
CREATE VIRTUAL TABLE IF NOT EXISTS templateNameFts USING fts5 (
  name,
  normalized,
  content=templateName,
  content_rowid=rowid,
  tokenize='trigram'
);
CREATE VIRTUAL TABLE IF NOT EXISTS cardSettingNameFts USING fts5 (
  name,
  normalized,
  content=cardSettingName,
  content_rowid=rowid,
  tokenize='trigram'
);
CREATE TRIGGER IF NOT EXISTS template_after_insert AFTER INSERT ON template BEGIN
  INSERT INTO templateNameFts (rowid, name) VALUES (new.rowid, new.name);
END;
CREATE TRIGGER IF NOT EXISTS template_after_delete AFTER DELETE ON template BEGIN
  INSERT INTO templateNameFts (templateNameFts, rowid, name) VALUES('delete', old.rowid, old.name);
END;
CREATE TRIGGER IF NOT EXISTS template_after_update AFTER UPDATE OF name ON template BEGIN
  INSERT INTO templateNameFts (templateNameFts, rowid, name) VALUES('delete', old.rowid, old.name);
  INSERT INTO templateNameFts (rowid, name) VALUES (new.rowid, new.name);
END;
CREATE TRIGGER IF NOT EXISTS cardSetting_after_insert AFTER INSERT ON setting
WHEN new.key = 'name' AND new.id <> '' -- 5A7C82EC-D401-4250-896C-DDB0FBE9107E
BEGIN
  INSERT INTO cardSettingNameFts (rowid, name) VALUES (new.rowid, new.value);
END;
CREATE TRIGGER IF NOT EXISTS cardSetting_after_delete AFTER DELETE ON setting
WHEN old.key = 'name' AND old.id <> '' -- 5A7C82EC-D401-4250-896C-DDB0FBE9107E
BEGIN
  INSERT INTO cardSettingNameFts (cardSettingNameFts, rowid, name) VALUES('delete', old.rowid, old.value);
END;
CREATE TRIGGER IF NOT EXISTS cardSetting_after_update AFTER UPDATE ON setting
WHEN new.key = 'name' AND new.id <> '' -- 5A7C82EC-D401-4250-896C-DDB0FBE9107E
BEGIN
  INSERT INTO cardSettingNameFts (cardSettingNameFts, rowid, name) VALUES('delete', old.rowid, old.value);
  INSERT INTO cardSettingNameFts (rowid, name) VALUES (new.rowid, new.value);
END;
CREATE TABLE IF NOT EXISTS remoteNote (
  localId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  nook TEXT,
  remoteId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  uploadDate INTEGER,
  PRIMARY KEY (localId, nook)
) STRICT;
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY, -- should stay TEXT!
  created INTEGER,
  edited INTEGER,
  data BLOB,
  hash BLOB -- highTODO this *needs* a unique constraint - the `updateTemplateRemoteIds` fn assumes hashes are unique
) STRICT;
CREATE TABLE IF NOT EXISTS remoteMedia (
  localEntityId TEXT, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  localMediaId TEXT, -- should stay TEXT!
  remoteMediaId TEXT,
  uploadDate INTEGER,
  PRIMARY KEY (localEntityId, localMediaId)
) STRICT;
CREATE TABLE IF NOT EXISTS plugin (
  name TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  version TEXT,
  dependencies TEXT,
  created INTEGER,
  edited INTEGER,
  script BLOB
) STRICT;
CREATE TABLE IF NOT EXISTS review (
  id TEXT PRIMARY KEY, -- make BLOB upon SQLite v3.41 and the landing of UNHEX https://sqlite.org/forum/forumpost/30cca4e613d2fa2a grep F235B7FB-8CEA-4AE2-99CC-2790E607B1EB
  cardId TEXT,
  created INTEGER,
  rating INTEGER,
  kind INTEGER,
  details TEXT
) STRICT;
PRAGMA temp_store=MEMORY; -- grep 2790D3E0-F98B-4A95-8910-AC3E87F4F2D3
CREATE INDEX IF NOT EXISTS review_cardId_idx on review(cardId);
SELECT crsql_as_crr('template');
SELECT crsql_as_crr('remoteTemplate');
SELECT crsql_as_crr('remoteNote');
SELECT crsql_as_crr('media');
SELECT crsql_as_crr('remoteMedia');
SELECT crsql_as_crr('plugin');
