import { cardCollectionMethods } from "./sqlite/card"
import { noteCollectionMethods } from "./sqlite/note"
import { templateCollectionMethods } from "./sqlite/template"
import { dexieMethods } from "./dexie/dexie"
import { sync } from "./sqlite/crsqlite"

export const db = {
  ...templateCollectionMethods,
  ...cardCollectionMethods,
  ...noteCollectionMethods,
  ...dexieMethods,
  sync,
}
