import { PluginDocType } from "../../secure/rxdb/plugin.schema"

export interface Plugin extends PluginDocType {
  readonly script: Blob
}
