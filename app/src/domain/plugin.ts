import { PluginId } from "./ids"

export interface Plugin {
  readonly name: string
  readonly id: PluginId
  readonly created: Date
  readonly modified: Date
  readonly script: Blob
}
