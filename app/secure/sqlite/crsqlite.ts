import * as sqliteWasm from "@vlcn.io/wa-crsqlite"
import { initSql } from "shared"

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
      // need to update this version number 👇👇 after every upgrade. lowTODO figure out something better. Grep for F00E815A-C0FD-4AEA-B83C-0BDB641D97CC
      "https://esm.sh/@vlcn.io/wa-crsqlite@0.4.1/dist/wa-sqlite-async.wasm"
  )
  const db = await sqlite.open("username.db")
  await db.execMany(initSql)
  return db
}
