import WDB, {
  Changeset,
  PokeProtocol,
  SiteIDLocal,
  SiteIDWire,
  WholeDbReplicator,
} from "@vlcn.io/replicator-wholedb"
import { DB, DBAsync } from "@vlcn.io/xplat-api"
import { stringify as uuidStringify } from "uuid"
import { lrpc } from "../../src/lrpcClient"

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
  private readonly site: Peer
  private readonly establishedConnections: Map<SiteIDWire, DataConnection> =
    new Map()

  private readonly pendingConnections: Map<SiteIDWire, DataConnection> =
    new Map()

  private _replicator?: WholeDbReplicator

  public onConnectionsChanged:
    | ((
        pending: Map<SiteIDWire, DataConnection>,
        established: Map<SiteIDWire, DataConnection>
      ) => void)
    | null = null

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
    this._replicator = await WDB.install(this.siteId, this._db, this)
  }

  async schemaChanged(): Promise<void> {
    await this._replicator!.schemaChanged()
  }

  connectTo(other: SiteIDWire) {
    if (this.pendingConnections.has(other)) {
      const c = this.pendingConnections.get(other)
      c?.close()
    }

    const conn = this.site.connect(other)
    this.pendingConnections.set(other, conn)
    this._connectionsChanged()
    conn.on("open", () => {
      this._newConnection(conn)
    })
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
    this.replicator!.dispose()
    this.site.destroy()
  }

  private readonly _newConnection = (conn: DataConnection) => {
    const siteId = conn.peer
    this.pendingConnections.delete(conn.peer)

    conn.on("data", (data) => this._dataReceived(siteId, data as Msg))
    conn.on("close", () => {
      this.establishedConnections.delete(conn.peer)
      this._connectionsChanged()
    })
    conn.on("error", (e) => {
      // TODO: more reporting to the callers of us
      console.error(e)
      this.establishedConnections.delete(conn.peer)
      this._connectionsChanged()
    })

    this.establishedConnections.set(conn.peer, conn)
    this._connectionsChanged()(this._onNewConnection != null) &&
      this._onNewConnection(conn.peer)
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

  private _connectionsChanged(): void {
    this.onConnectionsChanged?.(
      this.pendingConnections,
      this.establishedConnections
    )
  }
}

class WholeDbRtcPublic {
  private readonly _listeners = new Set<
    (pending: SiteIDWire[], established: SiteIDWire[]) => void
  >()

  constructor(private readonly _wdbRtc: WholeDbRtc) {
    _wdbRtc.onConnectionsChanged = this._connectionsChanged
  }

  get siteId(): SiteIDLocal {
    return this._wdbRtc.siteId
  }

  connectTo(other: SiteIDWire): void {
    this._wdbRtc.connectTo(other)
  }

  onConnectionsChanged(
    cb: (pending: SiteIDWire[], established: SiteIDWire[]) => void
  ): () => boolean {
    this._listeners.add(cb)
    return () => this._listeners.delete(cb)
  }

  offConnectionsChanged(
    cb: (pending: SiteIDWire[], established: SiteIDWire[]) => void
  ): void {
    this._listeners.delete(cb)
  }

  async schemaChanged(): Promise<void> {
    await this._wdbRtc.schemaChanged()
  }

  private readonly _connectionsChanged = (
    pending: Map<SiteIDWire, DataConnection>,
    established: Map<SiteIDWire, DataConnection>
  ): void => {
    // notify listeners
    for (const l of this._listeners) {
      try {
        l([...pending.keys()], [...established.keys()])
      } catch (e) {
        console.error(e)
      }
    }
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
