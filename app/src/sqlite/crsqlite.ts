import sqliteWasm, { DB as crDB } from "@vlcn.io/crsqlite-wasm"
import { initSql, wholeDbReplicator } from "shared"
import { lrpc } from "../lrpcClient"
import { stringify as uuidStringify } from "uuid"
import { DB } from "./database"
import { CRDatabase, CRDialect } from "./dialect"
import { Kysely } from "kysely"
import crsqliteUrl from "@vlcn.io/crsqlite-wasm/crsqlite.wasm?url"
import wdbRtc from "./wholeDbRtc"

let myDatabase: Promise<crDB> | null = null
let myCrRtc: Awaited<ReturnType<typeof wdbRtc>> | null = null

export async function getDb() {
  if (myDatabase == null) {
    myDatabase = createDb()
  }
  return await myDatabase
}

export async function getCrRtc() {
  if (myCrRtc == null) {
    myCrRtc = await createCrRtc()
  }
  return myCrRtc
}

async function createDb() {
  const sqlite = await sqliteWasm(() => crsqliteUrl)
  const db = await sqlite.open("username.db")
  await db.execMany(initSql)
  return db
}

async function createCrRtc() {
  const db = await getDb()
  return await wdbRtc(db, {
    // @ts-expect-error the option exists https://peerjs.com/docs/#peer-options-secure
    secure: true,
    host: "peer.pentive.local",
    port: 3018,
  })
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
