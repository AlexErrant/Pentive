import { DB, DBAsync } from "@vlcn.io/xplat-api"
import { parse as uuidParse, stringify as uuidStringify } from "uuid"
export type SiteIDWire = string
export type SiteIDLocal = Uint8Array
type CID = string
type QuoteConcatedPKs = string | number
type TableName = string
type Version = number | string
type TODO = any

const isDebug = (globalThis as any).__vlcn_whole_db_dbg
function log(...data: any[]) {
  if (isDebug) {
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
   * Tell all connected sites that we have updates from this site
   * ending at `pokerVersion`
   */
  poke: (poker: SiteIDWire, pokerVersion: bigint) => void

  /**
   * Push changes to the given site in response to their request for changes.
   */
  pushChanges: (to: SiteIDWire, changesets: readonly Changeset[]) => void

  /**
   * Request changes from a given site since a given version
   * in response to a poke from that site.
   */
  requestChanges: (from: SiteIDWire, since: bigint) => void

  /**
   * Receive a poke froma given site.
   * In response, we'll compute what changes we're missing from that site
   * and request those changes.
   */
  onPoked: (
    cb: (pokedBy: SiteIDWire, pokerVersion: bigint) => Promise<void>
  ) => void

  /**
   * When someone new connects we can just poke them to kick off
   * initial sync. Simple.
   */
  onNewConnection: (cb: (siteID: SiteIDWire) => void) => void

  /**
   * A peer has requested changes from us.
   */
  onChangesRequested: (
    cb: (from: SiteIDWire, since: bigint) => Promise<void>
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
  any, // val,
  Version,
  SiteIDWire // site_id
]

const api = {
  async install(
    siteId: SiteIDLocal,
    db: DB | DBAsync,
    network: PokeProtocol
  ): Promise<WholeDbReplicator> {
    const ret = new WholeDbReplicator(siteId, db, network)
    await ret.init()
    return ret
  },
}

// TODO: we need to handle initial sync.
// Well, that should be easy. Just poke people on connect.

export class WholeDbReplicator {
  private _crrs: string[] = []
  private _pendingNotification = false
  private readonly _siteId: SiteIDLocal
  private readonly _siteIdWire: SiteIDWire

  constructor(
    siteId: SiteIDLocal,
    private readonly _db: DB | DBAsync,
    private readonly _network: PokeProtocol
  ) {
    this._db = _db
    _db.createFunction("crsql_wdbreplicator", () => this._crrChanged())

    this._siteId = siteId
    this._siteIdWire = uuidStringify(this._siteId)

    this._network.onPoked(this._poked)
    this._network.onNewConnection(this._newConnection)
    this._network.onChangesReceived(this._changesReceived)
    this._network.onChangesRequested(this._changesRequested)
  }

  async init(): Promise<void> {
    await this._installTriggers()
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

  async schemaChanged(): Promise<void> {
    return await this._installTriggers()
  }

  private async _installTriggers(): Promise<void> {
    // find all crr tables
    // TODO: ensure we are not notified
    // if we're in the process of applying sync changes.
    // TODO: we can also just track that internally.
    // well we do want to pass on to sites that are not the site
    // that just send the patch.
    const crrs: string[][] = await this._db.execA(
      "SELECT name FROM sqlite_master WHERE name LIKE '%__crsql_clock'"
    )

    const baseTableNames = crrs.map((crr) => {
      const fullTblName = crr[0]
      const baseTblName = fullTblName.substring(
        0,
        fullTblName.lastIndexOf("__crsql_clock")
      )
      ;["INSERT", "UPDATE", "DELETE"].map((verb) => {
        this._db.exec(
          `CREATE TEMP TRIGGER IF NOT EXISTS "${baseTblName}__crsql_wdbreplicator_${verb.toLowerCase()}" AFTER ${verb} ON "${baseTblName}"
          BEGIN
            select crsql_wdbreplicator() WHERE crsql_internal_sync_bit() = 0;
          END;
        `
        )
      })

      return baseTblName
    })
    this._crrs = baseTableNames
  }

  private async _createPeerTrackingTable(): Promise<void> {
    await this._db.exec(
      "CREATE TABLE IF NOT EXISTS __crsql_wdbreplicator_peers (site_id primary key, version)"
    )
  }

  private _crrChanged(): void {
    if (this._pendingNotification) {
      return
    }

    this._pendingNotification = true
    queueMicrotask(async () => {
      const r = await this._db.execA<[number | bigint]>(
        "SELECT crsql_dbversion()"
      )
      const dbv = r[0][0]
      this._pendingNotification = false
      // TODO: maybe wait for network before setting pending to false
      log("poking across the network")
      this._network.poke(this._siteIdWire, BigInt(dbv))
    })
  }

  private readonly _poked = async (
    pokedBy: SiteIDWire,
    pokerVersion: bigint
  ): Promise<void> => {
    log("received a poke from ", pokedBy)
    const rows = await this._db.execA(
      "SELECT CAST(version as TEXT) FROM __crsql_wdbreplicator_peers WHERE site_id = ?",
      [uuidParse(pokedBy)]
    )
    let ourVersionForPoker = 0n
    if (rows != null && rows.length > 0) {
      // ensure it is a bigint. sqlite will return number if in js int range and bigint if out of range.
      ourVersionForPoker = BigInt(rows[0][0] || 0)
    }

    // the poker version can be less than our version for poker if a set of
    // poke messages were queued up behind a sync.
    if (pokerVersion <= ourVersionForPoker) {
      return
    }

    // ask the poker for changes since our version
    log("requesting changes from ", pokedBy)
    this._network.requestChanges(pokedBy, ourVersionForPoker)
  }

  private readonly _newConnection = (siteId: SiteIDWire): void => {
    this._db.exec(
      "INSERT OR IGNORE INTO __crsql_wdbreplicator_peers VALUES (?, ?)",
      [uuidParse(siteId), 0]
    )
    // treat it as a crr change so we can kick off sync
    this._crrChanged()
  }

  // if we fail to apply, re-request
  // TODO: other retry mechanisms
  // todo: need to know who received from. cs site id can be a forwarded site id
  private readonly _changesReceived = async (
    fromSiteId: SiteIDWire,
    changesets: readonly Changeset[]
  ): Promise<void> => {
    await this._db.transaction(async () => {
      let maxVersion = 0n
      log("inserting changesets in tx", changesets)
      const stmt = await this._db.prepare(
        'INSERT INTO crsql_changes ("table", "pk", "cid", "val", "version", "site_id") VALUES (?, ?, ?, ?, CAST(? as INTEGER), ?)'
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
            v.toString(),
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
        `INSERT OR REPLACE INTO __crsql_wdbreplicator_peers (site_id, version) VALUES (?, CAST(? as INTEGER))`,
        [uuidParse(fromSiteId), maxVersion.toString()]
      )
    })
  }

  private readonly _changesRequested = async (
    from: SiteIDWire,
    since: bigint
  ): Promise<void> => {
    const fromAsBlob = uuidParse(from)
    // The casting is due to bigint support problems in various wasm builds of sqlite
    const changes: Changeset[] = await this._db.execA<Changeset>(
      `SELECT "table", "pk", "cid", "val", CAST("version" as TEXT), "site_id" FROM crsql_changes WHERE site_id != ? AND version > CAST(? as INTEGER)`,
      [fromAsBlob, since.toString()]
    )

    // TODO: temporary. better to `quote` out of db and `unquote` (to implement) into db
    changes.forEach((c) => (c[5] = uuidStringify(c[5] as any)))

    if (changes.length === 0) {
      return
    }
    log("pushing changesets across the network", changes)
    // console.log(changes);
    this._network.pushChanges(from, changes)
  }
}

export default api
