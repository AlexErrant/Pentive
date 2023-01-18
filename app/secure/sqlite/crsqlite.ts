import * as sqliteWasm from "@vlcn.io/wa-crsqlite"
import { initSql, wholeDbReplicator } from "shared"
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
      // You may need to `git clean -xdf` if you run into weird errors after an upgrade. I was getting "VFS '[object Object]' already registered", which means nothing to me. https://github.com/rhashimoto/wa-sqlite/pull/73
      // Need to update this version number 👇👇 after every upgrade. lowTODO figure out something better. Grep for F00E815A-C0FD-4AEA-B83C-0BDB641D97CC
      "https://esm.sh/@vlcn.io/wa-crsqlite@0.7.1/dist/wa-sqlite-async.wasm"
  )
  const db = await sqlite.open("username.db")
  await db.execMany(initSql)
  return db
}

export async function sync(): Promise<void> {
  const db = await getDb()
  const siteIdRaw = (
    await db.execA<[Uint8Array]>("SELECT crsql_siteid();")
  )[0][0]
  const siteId = uuidStringify(siteIdRaw)
  const dbVersion = (
    await db.execA<[number]>(`SELECT crsql_dbversion();`)
  )[0][0]
  const poke = await lrpc.poke.query({
    pokedBy: siteId,
    pokerVersion: BigInt(dbVersion),
  })
  const wdb = await wholeDbReplicator(db)
  await wdb.onChangesReceived(poke.siteId, poke.changes)
  if (poke.version != null) {
    const changeSets = await wdb.onChangesRequested(poke.siteId, poke.version)
    await lrpc.receiveChanges.mutate({
      changeSets,
      fromSiteId: siteId,
    })
  } else {
    console.log("No changes to push!")
  }
}
