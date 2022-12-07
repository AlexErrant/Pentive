import * as Comlink from "comlink"
import { cardCollectionMethods } from "./rxdb/card.orm"
import { heroCollectionMethods } from "./rxdb/hero.orm"
import { noteCollectionMethods } from "./rxdb/note.orm"
import { remove } from "./rxdb/rxdb"
import { templateCollectionMethods } from "./sqlite/template"
import { dexieMethods } from "./dexie/dexie"
import { sync } from "./sqlite/crsqlite"

export const exposed = {
  ...templateCollectionMethods,
  ...cardCollectionMethods,
  ...noteCollectionMethods,
  ...heroCollectionMethods,
  ...dexieMethods,
  remove,
  sync,
}

const targetOrigin = "*" // highTODO make more limiting. Also implement https://stackoverflow.com/q/8169582
Comlink.expose(exposed, Comlink.windowEndpoint(self.parent, self, targetOrigin))
