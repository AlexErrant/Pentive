import { PluginDocType } from "../../secure/rxdb/plugin.schema"

export type Type =
  | {
      readonly tag: "custom-element"
      readonly name: string
    }
  | {
      readonly tag: "function"
      readonly name: string
    }

export interface Plugin extends PluginDocType {
  readonly script: Blob
  readonly type: Type
}
