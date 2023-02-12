import { RemoteResourceId, ResourceId } from "./ids.js"

export interface Resource {
  readonly id: ResourceId
  readonly remoteId?: RemoteResourceId
  readonly created: Date
  readonly data: ArrayBuffer
}
