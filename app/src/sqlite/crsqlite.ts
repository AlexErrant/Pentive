import sqliteWasm, { type DB as crDB } from '@vlcn.io/crsqlite-wasm'
import { initSql } from 'shared'
import { lrpc } from '../lrpcClient'
import { stringify as uuidStringify } from 'uuid'
import { type DB } from './database'
import { type CRDatabase, CRDialect } from './dialect'
import { Kysely } from 'kysely'
import crsqliteUrl from '@vlcn.io/crsqlite-wasm/crsqlite.wasm?url'
import wdbRtc from './wholeDbRtc'
import { wholeDbReplicator } from 'shared-dom'
import { toastInfo } from '../components/toasts'

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
	const db = await sqlite.open('username.db')
	await db.execMany(initSql)
	return db
}

async function createCrRtc() {
	const db = await getDb()
	return await wdbRtc(db, {
		secure: true,
		host: import.meta.env.VITE_PEER_HOST,
		port: parseInt(import.meta.env.VITE_PEER_PORT),
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
	const db = await getDb()
	return new Kysely<DB>({
		dialect: new CRDialect({ database: db as CRDatabase }),
	})
}

export async function sync(): Promise<void> {
	const db = await getDb()
	const siteIdRaw = (
		await db.execA<[Uint8Array]>('SELECT crsql_siteid();')
	)[0]![0]
	const siteId = uuidStringify(siteIdRaw)
	const dbVersion = (
		await db.execA<[number]>(`SELECT crsql_dbversion();`)
	)[0]![0]
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
		toastInfo('No changes to push!')
	}
}
