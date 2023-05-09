import { type MediaId } from "shared"

export interface Media {
  readonly id: MediaId
  readonly created: Date
  readonly updated: Date
  readonly data: ArrayBuffer
}
