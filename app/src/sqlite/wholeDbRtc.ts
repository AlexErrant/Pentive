/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/naming-convention */
import WDB, {
  type Changeset,
  type PokeProtocol,
  type SiteIDLocal,
  type SiteIDWire,
  type WholeDbReplicator,
} from "./wholeDbReplicator.js"
import { type DBAsync } from "@vlcn.io/xplat-api"
import Peer, { type PeerJSOption, type DataConnection } from "peerjs"
import { untrack } from "solid-js/web"
import { stringify as uuidStringify } from "uuid"
import { getUserId } from "../globalState.js"
import { cwaClient } from "../trpcClient.js"
import { type JWTVerifyResult, jwtVerify, importSPKI } from "jose"
import { alg } from "cwa/src/peerSync.js"

type Msg = PokeMsg | ChangesMsg | RequestChangesMsg
/**
 * TODO: we can improve the poke msg to facilitate daisy chaining of updates among peers.
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
  private readonly establishedConnections = new Map<
    SiteIDWire,
    DataConnection
  >()

  private readonly pendingConnections = new Map<SiteIDWire, DataConnection>()

  private replicator?: WholeDbReplicator

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
    private readonly db: DBAsync,
    peerOption: PeerJSOption
  ) {
    this.site = new Peer(uuidStringify(siteId), peerOption)
    this.site.on("connection", async (c) => {
      if (await validateToken(c.provider.options.token)) {
        c.on("open", () => {
          this._newConnection(c)
        })
      } else {
        c.close()
        console.warn(
          `Incoming connection failed due to invalid token: ${
            c.provider.options.token ?? "undefined"
          }`
        )
      }
    })
  }

  async _init() {
    this.replicator = await WDB.install(this.siteId, this.db, this)
  }

  async schemaChanged() {
    const r = this.replicator
    if (r == null) {
      console.warn("replicator is null")
    } else {
      await r.schemaChanged()
    }
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
    if (conn != null) {
      conn.send(msg)
    }
  }

  requestChanges(from: SiteIDWire, since: bigint): void {
    const msg: RequestChangesMsg = {
      tag: "request-changes",
      since: since.toString(),
    }
    const conn = this.establishedConnections.get(from)
    if (conn != null) {
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
    const r = this.replicator
    if (r != null) {
      r.dispose()
    }

    this.site.destroy()
  }

  private readonly _newConnection = (conn: DataConnection) => {
    const siteId = conn.peer
    this.pendingConnections.delete(conn.peer)

    conn.on("data", (data) => {
      this._dataReceived(siteId, data as Msg)
    })
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
    this._connectionsChanged()
    this._onNewConnection != null && this._onNewConnection(conn.peer)
  }

  private _dataReceived(from: SiteIDWire, data: Msg) {
    switch (data.tag) {
      case "poke":
        console.log(`Poking with v${data.version}...`)
        this._onPoked != null && this._onPoked(from, BigInt(data.version))
        console.log(`Poked!`)
        break
      case "apply-changes":
        console.log(`Applying ${data.changes.length} changes...`)
        this._onChangesReceived != null &&
          this._onChangesReceived(from, data.changes)
        console.log("Applied changes!")
        break
      case "request-changes":
        console.log("Requesting changes since", data.since)
        this._onChangesRequested != null &&
          this._onChangesRequested(from, BigInt(data.since))
        console.log("Requested changes!")
        break
    }
  }

  _connectionsChanged() {
    this.onConnectionsChanged != null &&
      this.onConnectionsChanged(
        this.pendingConnections,
        this.establishedConnections
      )
  }
}

class WholeDbRtcPublic {
  readonly _listeners = new Set<
    (pending: SiteIDWire[], established: SiteIDWire[]) => void
  >()

  constructor(readonly _wdbrtc: WholeDbRtc) {
    _wdbrtc.onConnectionsChanged = this._connectionsChanged
  }

  get siteId() {
    return this._wdbrtc.siteId
  }

  connectTo(other: SiteIDWire) {
    this._wdbrtc.connectTo(other)
  }

  onConnectionsChanged(
    cb: (pending: SiteIDWire[], established: SiteIDWire[]) => void
  ) {
    this._listeners.add(cb)
    return () => this._listeners.delete(cb)
  }

  offConnectionsChanged(
    cb: (pending: SiteIDWire[], established: SiteIDWire[]) => void
  ) {
    this._listeners.delete(cb)
  }

  async schemaChanged() {
    await this._wdbrtc.schemaChanged()
  }

  readonly _connectionsChanged = (
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
    this._wdbrtc.dispose()
  }
}

export default async function wholeDbRtc(
  db: DBAsync,
  peerOption: PeerJSOption
): Promise<WholeDbRtcPublic> {
  const siteId = (await db.execA<[Uint8Array]>("SELECT crsql_siteid();"))[0][0]
  const internal = new WholeDbRtc(siteId, db, peerOption)
  await internal._init()
  return new WholeDbRtcPublic(internal)
}

async function validateToken(token: string | undefined) {
  if (token == null) return false
  const publicKeyString = await cwaClient.getPeerSyncPublicKey.query()
  const publicKey = await importSPKI(publicKeyString, alg)
  let jwt: JWTVerifyResult | null = null
  try {
    jwt = await jwtVerify(token, publicKey)
  } catch {}
  if (jwt?.payload.sub == null) {
    return false
  }
  return jwt.payload.sub === untrack(getUserId)
}
