import { ResourceId } from "./ids"

export interface Resource {
  readonly id: ResourceId
  readonly created: Date
  readonly data: ArrayBuffer
}
