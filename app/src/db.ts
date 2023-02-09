import { cardCollectionMethods } from "./sqlite/card"
import { noteCollectionMethods } from "./sqlite/note"
import { templateCollectionMethods } from "./sqlite/template"
import { resourceCollectionMethods } from "./sqlite/resource"
import { pluginCollectionMethods } from "./sqlite/plugin"
// import { dexieMethods } from "./dexie/dexie"
import { sync } from "./sqlite/crsqlite"

export const db = {
  ...templateCollectionMethods,
  ...pluginCollectionMethods,
  ...cardCollectionMethods,
  ...noteCollectionMethods,
  // ...dexieMethods,
  ...resourceCollectionMethods,
  sync,
}
