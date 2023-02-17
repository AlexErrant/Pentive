import { MediaId } from "./ids"

export interface Media {
  readonly id: MediaId
  readonly created: Date
  readonly data: ArrayBuffer
}
