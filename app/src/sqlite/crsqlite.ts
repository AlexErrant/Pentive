import sqliteWasm, { type DB as crDB } from '@vlcn.io/crsqlite-wasm'
import { lrpc } from '../lrpcClient'
import { stringify as uuidStringify } from 'uuid'
import { type DB } from './database'
import { type CRDatabase, CRDialect } from './dialect'
import { Kysely } from 'kysely'
import crsqliteUrl from '@vlcn.io/crsqlite-wasm/crsqlite.wasm?url'
import wdbRtc from './wholeDbRtc'
import { wholeDbReplicator } from 'shared-dom/wholeDbReplicator'
import { C } from '../topLevelAwait'
import { SQLITE_DETERMINISTIC, SQLITE_UTF8 } from '@vlcn.io/wa-sqlite'
import initSql from 'shared/sql.json'
import { ftsNormalize } from 'shared/htmlToText'

// const dp = new DOMParser()

function getMediaIds(fvs: string) {
	// highTODO uncomment and fix by adding the mediaId table back
	// const values = parseMap<string, string>(fvs).values()
	// return Array.from(values)
	// 	.flatMap((v) => dp.parseFromString(v, 'text/html'))
	// 	.flatMap((d) => Array.from(d.images))
	// 	.map((i) => i.getAttribute('src'))
	// 	.join(unitSeparator)
}

export async function createDb() {
	const sqlite = await sqliteWasm(() => crsqliteUrl)
	const db = await sqlite.open('username.db')
	await db.execMany(initSql)
	db.createFunction('getMediaIds', getMediaIds)
	// lowTODO compile in sqlean's regex https://github.com/vlcn-io/js/issues/51#issuecomment-2016481277
	// https://github.com/rhashimoto/wa-sqlite/blob/f1f8550ea9babe1867e5ec2c170aaaf0c649887e/demo/demo-worker.js#L63-L73
	// db.api.create_function(
	// 	db.db,
	// 	'regexp',
	// 	2,
	// 	SQLITE_UTF8 | SQLITE_DETERMINISTIC,
	// 	0,
	// 	function (context, values) {
	// 		const pattern = new RegExp(db.api.value_text(values[0]!))
	// 		const s = db.api.value_text(values[1]!)
	// 		db.api.result(context, pattern.test(s) ? 1 : 0)
	// 	},
	// 	undefined,
	// 	undefined,
	// )
	const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' })
	db.api.create_function(
		db.db,
		'regexp_with_flags',
		3,
		SQLITE_UTF8 | SQLITE_DETERMINISTIC,
		0,
		function (context, values) {
			const pattern = new RegExp(
				db.api.value_text(values[0]!),
				db.api.value_text(values[1]!),
			)
			const s = db.api.value_text(values[2]!)
			db.api.result(context, pattern.test(s) ? 1 : 0)
		},
		undefined,
		undefined,
	)
	db.api.create_function(
		db.db,
		'word',
		3,
		SQLITE_UTF8 | SQLITE_DETERMINISTIC,
		0,
		function (context, values) {
			const leftRightBoth = db.api.value_int(values[0]!)
			const word = db.api.value_text(values[1]!)
			const col = db.api.value_text(values[2]!)
			const segments = Array.from(segmenter.segment(col))
			const b =
				leftRightBoth === 0 // 0 1 2 correspond to C3B5BEA8-3A89-40CB-971F-6FBA780A6487
					? segments.some((s) => s.segment.startsWith(word))
					: leftRightBoth === 1
						? segments.some((s) => s.segment === word)
						: segments.some((s) => s.segment.endsWith(word))
			db.api.result(context, b ? 1 : 0)
		},
		undefined,
		undefined,
	)
	db.api.create_function(
		db.db,
		'ftsNormalize',
		4,
		SQLITE_UTF8 | SQLITE_DETERMINISTIC,
		0,
		function (context, values) {
			const html = db.api.value_text(values[0]!)
			const stripHtml = db.api.value_int(values[1]!) === 1
			const caseFoldBool = db.api.value_int(values[2]!) === 1
			const removeCombiningCharacters = db.api.value_int(values[3]!) === 1
			const normalized = ftsNormalize(
				html,
				stripHtml,
				caseFoldBool,
				removeCombiningCharacters,
			)
			db.api.result(context, normalized)
		},
		undefined,
		undefined,
	)
	return db
}

export async function createWdbRtc(db: crDB) {
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

export async function sync(db: crDB): Promise<void> {
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
		C.toastInfo('No changes to push!')
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
