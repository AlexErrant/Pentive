import { cardCollectionMethods } from "./sqlite/card.js"
import { noteCollectionMethods } from "./sqlite/note.js"
import { templateCollectionMethods } from "./sqlite/template.js"
import { resourceCollectionMethods } from "./sqlite/resource.js"
import { pluginCollectionMethods } from "./sqlite/plugin.js"
// import { dexieMethods } from "./dexie/dexie"
import { sync } from "./sqlite/crsqlite.js"

export const db = {
  ...templateCollectionMethods,
  ...pluginCollectionMethods,
  ...cardCollectionMethods,
  ...noteCollectionMethods,
  // ...dexieMethods,
  ...resourceCollectionMethods,
  sync,
}
