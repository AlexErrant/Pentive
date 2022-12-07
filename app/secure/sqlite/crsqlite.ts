import * as sqliteWasm from "@vlcn.io/wa-crsqlite"
import { initSql } from "shared"
import { lrpc } from "../../src/lrpcClient"
import { stringify as uuidStringify } from "uuid"

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

export async function sync(): Promise<void> {
  const db = await getDb()
  const siteId = (await db.execA<[Uint8Array]>("SELECT crsql_siteid();"))[0][0]
  const dbVersion = (
    await db.execA<[number]>(`SELECT crsql_dbversion();`)
  )[0][0]
  const poke = await lrpc.poke.query({
    pokedBy: uuidStringify(siteId),
    pokerVersion: BigInt(dbVersion),
  })
  console.log("poke response:", poke)
}
