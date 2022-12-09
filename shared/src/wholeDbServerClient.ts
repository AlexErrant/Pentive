import {
  api,
  Changeset,
  PokeProtocol,
  SiteIDLocal,
  SiteIDWire,
  WholeDbReplicator,
} from "./wholeDbReplicator.js"
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
class WholeDbRtc implements PokeProtocol {
  private _replicator!: WholeDbReplicator

  private _onPoked!: (
    pokedBy: SiteIDWire,
    pokerVersion: bigint
  ) => Promise<bigint | null>

  private _onChangesRequested!: (
    from: SiteIDWire,
    since: bigint
  ) => Promise<Changeset[]>

  private _onChangesReceived!: (
    fromSiteId: SiteIDWire,
    changesets: readonly Changeset[]
  ) => Promise<void>

  constructor(
    public readonly siteId: SiteIDLocal,
    private readonly _db: DB | DBAsync
  ) {}

  async init(): Promise<void> {
    this._replicator = await api.install(this._db, this)
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
    this._replicator.dispose()
  }

  async poked(
    pokedBy: SiteIDWire,
    pokerVersion: bigint
  ): Promise<bigint | null> {
    return await this._onPoked(pokedBy, pokerVersion)
  }

  async changesRequested(
    from: SiteIDWire,
    since: bigint
  ): Promise<Changeset[]> {
    return await this._onChangesRequested(from, since)
  }

  async changesReceived(
    fromSiteId: SiteIDWire,
    changesets: readonly Changeset[]
  ): Promise<void> {
    return await this._onChangesReceived(fromSiteId, changesets)
  }

  private async _dataReceived(from: SiteIDWire, data: Msg): Promise<void> {
    switch (data.tag) {
      case "poke":
        await this._onPoked(from, BigInt(data.version))
        break
      case "apply-changes":
        await this._onChangesReceived(from, data.changes)
        break
      case "request-changes":
        await this._onChangesRequested(from, BigInt(data.since))
        break
    }
  }
}

export async function wholeDbRtc(db: DB | DBAsync): Promise<WholeDbRtc> {
  const siteId = (await db.execA<[Uint8Array]>("SELECT crsql_siteid();"))[0][0]
  const wdb = new WholeDbRtc(siteId, db)
  await wdb.init()
  return wdb
}
