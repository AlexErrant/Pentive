import { MediaId } from "./ids"

export interface Media {
  readonly id: MediaId
  readonly created: Date
  readonly modified: Date
  readonly data: ArrayBuffer
}
