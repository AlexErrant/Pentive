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
  private _replicator?: WholeDbReplicator

  private _onPoked:
    | ((pokedBy: SiteIDWire, pokerVersion: bigint) => Promise<bigint | null>)
    | null = null

  private _onChangesRequested:
    | ((from: SiteIDWire, since: bigint) => Promise<Changeset[]>)
    | null = null

  private _onChangesReceived:
    | ((
        fromSiteId: SiteIDWire,
        changesets: readonly Changeset[]
      ) => Promise<void>)
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

  onPoked(
    cb: (pokedBy: SiteIDWire, pokerVersion: bigint) => Promise<bigint | null>
  ): void {
    this._onPoked = cb
  }

  onChangesRequested(
    cb: (from: SiteIDWire, since: bigint) => Promise<Changeset[]>
  ): void {
    this._onChangesRequested = cb
  }

  onChangesReceived(
    cb: (
      fromSiteId: SiteIDWire,
      changesets: readonly Changeset[]
    ) => Promise<void>
  ): void {
    this._onChangesReceived = cb
  }

  dispose(): void {
    this._replicator?.dispose()
  }

  private async _dataReceived(from: SiteIDWire, data: Msg): Promise<void> {
    switch (data.tag) {
      case "poke":
        await this._onPoked?.(from, BigInt(data.version))
        break
      case "apply-changes":
        await this._onChangesReceived?.(from, data.changes)
        break
      case "request-changes":
        await this._onChangesRequested?.(from, BigInt(data.since))
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
