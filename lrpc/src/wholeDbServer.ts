import WDB, {
  Changeset,
  PokeProtocol,
  SiteIDLocal,
  SiteIDWire,
  WholeDbReplicator,
} from "./wholeDbReplicator"
import { DB, DBAsync } from "@vlcn.io/xplat-api"

type Msg = PokeMsg | ChangesMsg | RequestChangesMsg
/**
 * TODO: we can improve the poke msg to facilitate daisy chaning of updates among peers.
 * If the poke is the result of a sync it should include:
 * - poker id (if we are proxying)
 * - max version for that id
 */
interface PokeMsg {
  tag: "poke"
  version: string | number
}
interface ChangesMsg {
  tag: "apply-changes"
  // TODO: metadata on min/max versions could be useful
  changes: readonly Changeset[]
}
interface RequestChangesMsg {
  tag: "request-changes"
  since: string | number
}

export class WholeDbRtc implements PokeProtocol {
  private _replicator?: WholeDbReplicator

  private _onPoked:
    | ((pokedBy: SiteIDWire, pokerVersion: bigint) => void)
    | null = null

  private _onNewConnection: ((siteID: SiteIDWire) => void) | null = null
  private _onChangesRequested:
    | ((from: SiteIDWire, since: bigint) => void)
    | null = null

  private _onChangesReceived:
    | ((fromSiteId: SiteIDWire, changesets: readonly Changeset[]) => void)
    | null = null

  constructor(
    public readonly siteId: SiteIDLocal,
    private readonly _db: DB | DBAsync
  ) {
    this.site = new Peer(uuidStringify(siteId), {
      host: "localhost",
      port: 9000,
      path: "/examples",
    })
    this.site.on("connection", (c) => {
      c.on("open", () => this._newConnection(c))
    })
  }

  async init(): Promise<void> {
    this._replicator = await WDB.install(this._db, this)
  }

  async schemaChanged(): Promise<void> {
    await this._replicator?.schemaChanged()
  }

  poke(poker: SiteIDWire, pokerVersion: bigint): void {
    const msg: PokeMsg = {
      tag: "poke",
      version: pokerVersion.toString(),
    }
    this.establishedConnections.forEach((conn) => {
      conn.send(msg)
    })
  }

  pushChanges(to: SiteIDWire, changesets: readonly Changeset[]): void {
    const msg: ChangesMsg = {
      tag: "apply-changes",
      changes: changesets,
    }
    const conn = this.establishedConnections.get(to)
    if (conn) {
      conn.send(msg)
    }
  }

  requestChanges(from: SiteIDWire, since: bigint): void {
    const msg: RequestChangesMsg = {
      tag: "request-changes",
      since: since.toString(),
    }
    const conn = this.establishedConnections.get(from)
    if (conn) {
      conn.send(msg)
    }
  }

  onPoked(cb: (pokedBy: SiteIDWire, pokerVersion: bigint) => void): void {
    this._onPoked = cb
  }

  onNewConnection(cb: (siteID: SiteIDWire) => void): void {
    this._onNewConnection = cb
  }

  onChangesRequested(cb: (from: SiteIDWire, since: bigint) => void): void {
    this._onChangesRequested = cb
  }

  onChangesReceived(
    cb: (fromSiteId: SiteIDWire, changesets: readonly Changeset[]) => void
  ): void {
    this._onChangesReceived = cb
  }

  dispose(): void {
    this._replicator?.dispose()
  }

  private readonly _newConnection = (conn: DataConnection) => {
    conn.on("data", (data) => this._dataReceived(conn.peer, data as Msg))
  }

  private _dataReceived(from: SiteIDWire, data: Msg): void {
    switch (data.tag) {
      case "poke":
        this._onPoked?.(from, BigInt(data.version))
        break
      case "apply-changes":
        this._onChangesReceived?.(from, data.changes)
        break
      case "request-changes":
        this._onChangesRequested?.(from, BigInt(data.since))
        break
    }
  }
}

class WholeDbRtcPublic {
  constructor(private readonly _wdbRtc: WholeDbRtc) {}

  get siteId(): SiteIDLocal {
    return this._wdbRtc.siteId
  }

  async schemaChanged(): Promise<void> {
    await this._wdbRtc.schemaChanged()
  }

  dispose(): void {
    this._wdbRtc.dispose()
  }
}

export default async function wholeDbRtc(
  db: DB | DBAsync
): Promise<WholeDbRtcPublic> {
  const siteId = (await db.execA<[Uint8Array]>("SELECT crsql_siteid();"))[0][0]
  const internal = new WholeDbRtc(siteId, db)
  await internal.init()
  return new WholeDbRtcPublic(internal)
}
