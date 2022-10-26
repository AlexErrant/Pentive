import { RemoteResourceId, ResourceId } from "./ids"

export interface Resource {
  readonly id: ResourceId
  readonly remoteId: RemoteResourceId
  readonly created: Date
  readonly data: ArrayBuffer
}
