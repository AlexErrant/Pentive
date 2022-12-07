export const initSql = [
  `CREATE TABLE IF NOT EXISTS template (
    id BLOB PRIMARY KEY,
    pushId BLOB,
    push INT,
    name TEXT,
    css TEXT,
    fields TEXT,
    created, -- https://github.com/vlcn-io/cr-sqlite/issues/85
    modified,
    templateType TEXT
);`,
  `CREATE TABLE IF NOT EXISTS note (
    id BLOB PRIMARY KEY,
    templateId BLOB,
    pushId BLOB,
    pushTemplateId BLOB,
    push INT,
    ankiNoteId INT,
    created, -- https://github.com/vlcn-io/cr-sqlite/issues/85
    modified,
    tags TEXT,
    fieldValues TEXT
);`,
  `SELECT crsql_as_crr('template');`,
  `SELECT crsql_as_crr('note');`,
]
