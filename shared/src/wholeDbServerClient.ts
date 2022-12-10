import {
  api,
  Changeset,
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

// private async _dataReceived(from: SiteIDWire, data: Msg): Promise<void> {
//   switch (data.tag) {
//     case "poke":
//       await this._onPoked(from, BigInt(data.version))
//       break
//     case "apply-changes":
//       await this._onChangesReceived(from, data.changes)
//       break
//     case "request-changes":
//       await this._onChangesRequested(from, BigInt(data.since))
//       break
//   }
// }

export async function wholeDbRtc(db: DB | DBAsync): Promise<WholeDbReplicator> {
  const wdb = await api.install(db)
  await wdb.init()
  return wdb
}
