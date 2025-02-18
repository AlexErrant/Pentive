// I think this file can be deleted if/when lrpc actually starts to do real server-side syncing, since it looks like cr-sqlite now has https://github.com/vlcn-io/cr-sqlite/tree/main/js/packages/direct-connect-nodejs

import type { DBAsync } from '@vlcn.io/xplat-api'
import { parse as uuidParse, stringify as uuidStringify } from 'uuid'
type SiteIDWire = string
type CID = string
type QuoteConcatedPKs = string | number
type TableName = string
type Version = number | string

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
const isDebug = (globalThis as any).__vlcn_whole_db_dbg
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function log(...data: any[]) {
	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
	if (isDebug) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		console.log('whole-db: ', ...data)
	}
}

export type Changeset = [
	TableName,
	QuoteConcatedPKs,
	CID,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	any, // val,
	Version, // col version
	Version, // db version
	SiteIDWire, // site_id
]

// TODO: we need to handle initial sync.
// Well, that should be easy. Just poke people on connect.

class WholeDbReplicator {
	constructor(private readonly _db: DBAsync) {}

	async init() {
		await this._createPeerTrackingTable()
	}

	private async _createPeerTrackingTable() {
		await this._db.exec(
			'CREATE TABLE IF NOT EXISTS __crsql_wdbreplicator_peers (site_id BLOB primary key, version INTEGER) STRICT',
		)
	}

	onPoked = async (pokedBy: SiteIDWire, pokerVersion: bigint) => {
		log('received a poke from ', pokedBy)
		const rows = await this._db.execA(
			'SELECT version FROM __crsql_wdbreplicator_peers WHERE site_id = ?',
			[uuidParse(pokedBy)],
		)
		let ourVersionForPoker = 0n
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (rows != null && rows.length > 0) {
			// ensure it is a bigint. sqlite will return number if in js int range and bigint if out of range.
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/strict-boolean-expressions
			ourVersionForPoker = BigInt(rows[0]![0] || 0)
		}

		// the poker version can be less than our version for poker if a set of
		// poke messages were queued up behind a sync.
		if (pokerVersion <= ourVersionForPoker) {
			return null
		}

		// ask the poker for changes since our version
		log('requesting changes from ', pokedBy)
		return ourVersionForPoker
	}

	// if we fail to apply, re-request
	// TODO: other retry mechanisms
	// todo: need to know who received from. cs site id can be a forwarded site id
	onChangesReceived = async (
		fromSiteId: SiteIDWire,
		changesets: readonly Changeset[],
	) => {
		await this._db.tx(async (tx) => {
			let maxVersion = 0n
			log('inserting changesets in tx', changesets)
			const stmt = await tx.prepare(
				'INSERT INTO crsql_changes ("table", "pk", "cid", "val", "col_version", "db_version", "site_id") VALUES (?, ?, ?, ?, ?, ?, ?)',
			)
			// TODO: may want to chunk
			try {
				// TODO: should we discard the changes altogether if they're less than the tracking version
				// we have for this peer?
				// that'd preclude resetting tho.
				for (const cs of changesets) {
					const v = BigInt(cs[5])
					maxVersion = v > maxVersion ? v : maxVersion
					// cannot use same statement in parallel
					await stmt.run(
						tx,
						cs[0],
						cs[1],
						cs[2],
						cs[3],
						BigInt(cs[4]),
						v,
						// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
						cs[6] ? uuidParse(cs[6]) : 0,
					)
				}
			} catch (e) {
				console.error(e)
				throw e
			} finally {
				await stmt.finalize(tx)
			}

			await tx.exec(
				`INSERT OR REPLACE INTO __crsql_wdbreplicator_peers (site_id, version) VALUES (?, ?)`,
				[uuidParse(fromSiteId), maxVersion],
			)
		})
	}

	onChangesRequested = async (from: SiteIDWire, since: bigint) => {
		const fromAsBlob = uuidParse(from)
		// The casting is due to bigint support problems in various wasm builds of sqlite
		const changes: Changeset[] = await this._db.execA<Changeset>(
			`SELECT "table", "pk", "cid", "val", "col_version", "db_version", "site_id" FROM crsql_changes WHERE site_id != ? AND db_version > ?`,
			[fromAsBlob, since],
		)

		// TODO: temporary. better to `quote` out of db and `unquote` (to implement) into db
		// TODO: further complicated by https://github.com/rhashimoto/wa-sqlite/issues/69
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
		changes.forEach((c) => (c[6] = uuidStringify(c[6] as any)))

		log('pushing changesets across the network', changes)
		// console.log(changes);
		return changes
	}
}

export async function wholeDbReplicator(
	db: DBAsync,
): Promise<WholeDbReplicator> {
	const wdb = new WholeDbReplicator(db)
	await wdb.init()
	return wdb
}
