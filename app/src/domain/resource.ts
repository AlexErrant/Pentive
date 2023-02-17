import { MediaId } from "./ids"

export interface Resource {
  readonly id: MediaId
  readonly created: Date
  readonly data: ArrayBuffer
}
