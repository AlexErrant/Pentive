import { DB, DBAsync } from "@vlcn.io/xplat-api"
import { parse as uuidParse, stringify as uuidStringify } from "uuid"
export type SiteIDWire = string
export type SiteIDLocal = Uint8Array
type CID = string
type QuoteConcatedPKs = string | number
type TableName = string
type Version = number | string

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
const isDebug = (globalThis as any).__vlcn_whole_db_dbg
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function log(...data: any[]): void {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (isDebug) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    console.log("whole-db: ", ...data)
  }
}

/**
 * The `poke` protocol is the simplest option in terms of
 * - causal delivery of messages
 * - retry on drop
 */
export interface PokeProtocol {
  /**
   * Receive a poke from a given site.
   * In response, we'll compute what changes we're missing from that site
   * and request those changes.
   */
  onPoked: (
    cb: (pokedBy: SiteIDWire, pokerVersion: bigint) => Promise<bigint | null>
  ) => void

  /**
   * A peer has requested changes from us.
   */
  onChangesRequested: (
    cb: (from: SiteIDWire, since: bigint) => Promise<Changeset[]>
  ) => void

  /**
   * We have received changes from a peer.
   */
  onChangesReceived: (
    cb: (
      fromSiteId: SiteIDWire,
      changesets: readonly Changeset[]
    ) => Promise<void>
  ) => void

  dispose: () => void
}

export type Changeset = [
  TableName,
  QuoteConcatedPKs,
  CID,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any, // val,
  Version,
  SiteIDWire // site_id
]

export const api = {
  async install(
    db: DB | DBAsync,
    network: PokeProtocol
  ): Promise<WholeDbReplicator> {
    const ret = new WholeDbReplicator(db, network)
    await ret.init()
    return ret
  },
}

// TODO: we need to handle initial sync.
// Well, that should be easy. Just poke people on connect.

export class WholeDbReplicator {
  private _crrs: string[] = []

  constructor(
    private readonly _db: DB | DBAsync,
    private readonly _network: PokeProtocol
  ) {
    this._db = _db

    this._network.onPoked(this._onPoked)
    this._network.onChangesReceived(this._onChangesReceived)
    this._network.onChangesRequested(this._onChangesRequested)
  }

  async init(): Promise<void> {
    await this._createPeerTrackingTable()
  }

  dispose(): void {
    // remove trigger(s)
    // function extension is fine to stay, it'll get removed on connection termination
    this._crrs.forEach((crr) => {
      ;["INSERT", "UPDATE", "DELETE"].forEach((verb) =>
        this._db.exec(
          `DROP TRIGGER IF EXISTS "${crr}__crsql_wdbreplicator_${verb.toLowerCase()}";`
        )
      )
    })
  }

  private async _createPeerTrackingTable(): Promise<void> {
    await this._db.exec(
      "CREATE TABLE IF NOT EXISTS __crsql_wdbreplicator_peers (site_id BLOB primary key, version INTEGER) STRICT"
    )
  }

  private readonly _onPoked = async (
    pokedBy: SiteIDWire,
    pokerVersion: bigint
  ): Promise<bigint | null> => {
    log("received a poke from ", pokedBy)
    const rows = await this._db.execA(
      "SELECT version FROM __crsql_wdbreplicator_peers WHERE site_id = ?",
      [uuidParse(pokedBy)]
    )
    let ourVersionForPoker = 0n
    if (rows != null && rows.length > 0) {
      // ensure it is a bigint. sqlite will return number if in js int range and bigint if out of range.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/strict-boolean-expressions
      ourVersionForPoker = BigInt(rows[0][0] || 0)
    }

    // the poker version can be less than our version for poker if a set of
    // poke messages were queued up behind a sync.
    if (pokerVersion <= ourVersionForPoker) {
      return null
    }

    // ask the poker for changes since our version
    log("requesting changes from ", pokedBy)
    return ourVersionForPoker
  }

  private readonly _onNewConnection = async (
    siteId: SiteIDWire
  ): Promise<void> => {
    await this._db.exec(
      "INSERT OR IGNORE INTO __crsql_wdbreplicator_peers VALUES (?, ?)",
      [uuidParse(siteId), 0]
    )
  }

  // if we fail to apply, re-request
  // TODO: other retry mechanisms
  // todo: need to know who received from. cs site id can be a forwarded site id
  private readonly _onChangesReceived = async (
    fromSiteId: SiteIDWire,
    changesets: readonly Changeset[]
  ): Promise<void> => {
    await this._db.transaction(async () => {
      let maxVersion = 0n
      log("inserting changesets in tx", changesets)
      const stmt = await this._db.prepare(
        'INSERT INTO crsql_changes ("table", "pk", "cid", "val", "version", "site_id") VALUES (?, ?, ?, ?, ?, ?)'
      )
      // TODO: may want to chunk
      try {
        // TODO: should we discard the changes altogether if they're less than the tracking version
        // we have for this peer?
        // that'd preclude resetting tho.
        for (const cs of changesets) {
          const v = BigInt(cs[4])
          maxVersion = v > maxVersion ? v : maxVersion
          // cannot use same statement in parallel
          await stmt.run(
            cs[0],
            cs[1],
            cs[2],
            cs[3],
            v,
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            cs[5] ? uuidParse(cs[5]) : 0
          )
        }
      } catch (e) {
        console.error(e)
        throw e
      } finally {
        stmt.finalize()
      }

      await this._db.exec(
        `INSERT OR REPLACE INTO __crsql_wdbreplicator_peers (site_id, version) VALUES (?, ?)`,
        [uuidParse(fromSiteId), maxVersion]
      )
    })
  }

  private readonly _onChangesRequested = async (
    from: SiteIDWire,
    since: bigint
  ): Promise<Changeset[]> => {
    const fromAsBlob = uuidParse(from)
    // The casting is due to bigint support problems in various wasm builds of sqlite
    const changes: Changeset[] = await this._db.execA<Changeset>(
      `SELECT "table", "pk", "cid", "val", "version", "site_id" FROM crsql_changes WHERE site_id != ? AND version > ?`,
      [fromAsBlob, since]
    )

    // TODO: temporary. better to `quote` out of db and `unquote` (to implement) into db
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    changes.forEach((c) => (c[5] = uuidStringify(c[5] as any)))

    log("pushing changesets across the network", changes)
    // console.log(changes);
    return changes
  }
}
