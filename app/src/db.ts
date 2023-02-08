import { cardCollectionMethods } from "./rxdb/card.orm"
import { heroCollectionMethods } from "./rxdb/hero.orm"
import { noteCollectionMethods } from "./sqlite/note"
import { remove } from "./rxdb/rxdb"
import { templateCollectionMethods } from "./sqlite/template"
import { dexieMethods } from "./dexie/dexie"
import { sync } from "./sqlite/crsqlite"

export const db = {
  ...templateCollectionMethods,
  ...cardCollectionMethods,
  ...noteCollectionMethods,
  ...heroCollectionMethods,
  ...dexieMethods,
  remove,
  sync,
}
