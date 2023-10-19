import sqliteWasm, { type DB as crDB } from '@vlcn.io/crsqlite-wasm'
import { initSql, parseMap } from 'shared'
import { lrpc } from '../lrpcClient'
import { stringify as uuidStringify } from 'uuid'
import { type DB } from './database'
import { type CRDatabase, CRDialect } from './dialect'
import { Kysely } from 'kysely'
import crsqliteUrl from '@vlcn.io/crsqlite-wasm/crsqlite.wasm?url'
import wdbRtc from './wholeDbRtc'
import { wholeDbReplicator } from 'shared-dom'
import { toastInfo } from '../components/toasts'
import { unitSeparator } from './util'

let myDatabase: Promise<crDB> | null = null

async function rd() {
	if (myDatabase == null) {
		myDatabase = createDb()
	}
	return await myDatabase
}

const dp = new DOMParser()

export function getMediaIds(fvs: string) {
	const values = parseMap<string, string>(fvs).values()
	return Array.from(values)
		.flatMap((v) => dp.parseFromString(v, 'text/html'))
		.flatMap((d) => Array.from(d.images))
		.map((i) => i.getAttribute('src'))
		.join(unitSeparator)
}

export async function createDb() {
	const sqlite = await sqliteWasm(() => crsqliteUrl)
	const db = await sqlite.open('username.db')
	await db.execMany(initSql)
	db.createFunction('getMediaIds', getMediaIds)
	return db
}

export async function createCrRtc(db: crDB) {
	return await wdbRtc(db, {
		secure: true,
		host: import.meta.env.VITE_PEER_HOST,
		port: parseInt(import.meta.env.VITE_PEER_PORT),
	})
}

export function createKysely(db: crDB) {
	return new Kysely<DB>({
		dialect: new CRDialect({ database: db as CRDatabase }),
	})
}

export async function sync(): Promise<void> {
	const db = await rd()
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

export function createTx(k: Kysely<DB>, db: crDB) {
	return async (cb: (k: Kysely<DB>) => Promise<void>) => {
		const id = 'x' + crypto.randomUUID().replaceAll('-', '')
		await db.exec('SAVEPOINT ' + id)
		try {
			await cb(k)
		} catch (e) {
			await db.exec('ROLLBACK TO ' + id)
			await db.exec('RELEASE ' + id)
			throw e
		}
		await db.exec('RELEASE ' + id)
	}
}
