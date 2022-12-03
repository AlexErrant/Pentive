import * as sqliteWasm from "@vlcn.io/wa-crsqlite"

let myDatabase: Promise<sqliteWasm.DB> | null = null

export async function getDb(): Promise<sqliteWasm.DB> {
  if (myDatabase == null) {
    myDatabase = createDb()
  }
  return await myDatabase
}

async function createDb(): Promise<sqliteWasm.DB> {
  const sqlite = await sqliteWasm.default(
    (file) =>
      // need to update this version number 👇👇 after every upgrade. lowTODO figure out something better. Service worker also probably needs a reference.
      "https://esm.sh/@vlcn.io/wa-crsqlite@0.4.1/dist/wa-sqlite-async.wasm"
  )
  const db = await sqlite.open("username.db")
  await db.execMany([
    `CREATE TABLE IF NOT EXISTS template (
      id BLOB PRIMARY KEY,
      pushId BLOB,
      push INT,
      name TEXT,
      css TEXT,
      fields TEXT,
      created INT,
      modified INT,
      templateType TEXT
  );`,
    `CREATE TABLE IF NOT EXISTS note (
      id BLOB PRIMARY KEY,
      templateId BLOB,
      pushId BLOB,
      pushTemplateId BLOB,
      push INT,
      ankiNoteId INT,
      created INT,
      modified INT,
      tags TEXT,
      fieldValues TEXT
  );`,
    `SELECT crsql_as_crr('template');`,
    `SELECT crsql_as_crr('note');`,
  ])
  return db
}
