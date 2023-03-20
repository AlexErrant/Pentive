import * as sqliteWasm from "@vlcn.io/wa-crsqlite"
import { initSql, wholeDbReplicator } from "shared"
import { lrpc } from "../lrpcClient"
import { stringify as uuidStringify } from "uuid"
import { DB } from "./database"
import { CRDatabase, CRDialect } from "./dialect"
import { Kysely } from "kysely"
import sqliteUrl from "../assets/sqlite.wasm?url"

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
      // Is this cached by service worker? Grep for F00E815A-C0FD-4AEA-B83C-0BDB641D97CC
      sqliteUrl
  )
  const db = await sqlite.open("username.db")
  await db.execMany(initSql)
  return db
}

let myKysely: Promise<Kysely<DB>> | null = null

export async function getKysely(): Promise<Kysely<DB>> {
  if (myKysely == null) {
    myKysely = createKysely()
  }
  return await myKysely
}

async function createKysely(): Promise<Kysely<DB>> {
  const db = await createDb()
  return new Kysely<DB>({
    dialect: new CRDialect({ database: db as CRDatabase }),
  })
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
