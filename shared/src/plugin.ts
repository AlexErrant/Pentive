import { PluginId } from "./brand"

export interface Plugin {
  readonly name: string
  readonly id: PluginId
  readonly created: Date
  readonly modified: Date
  readonly script: Blob
}
