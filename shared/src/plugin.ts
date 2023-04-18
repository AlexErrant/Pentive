import { type PluginId } from "./brand"

export interface Plugin {
  readonly name: string
  readonly id: PluginId
  readonly created: Date
  readonly updated: Date
  readonly script: Blob
}
