import { type MediaId } from "../brand.js"

export interface Media {
  readonly id: MediaId
  readonly created: Date
  readonly updated: Date
  readonly data: ArrayBuffer
}
