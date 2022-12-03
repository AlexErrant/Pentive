import * as Comlink from "comlink"
import { cardCollectionMethods } from "./rxdb/card.orm"
import { heroCollectionMethods } from "./rxdb/hero.orm"
import { noteCollectionMethods } from "./rxdb/note.orm"
import { remove, sync } from "./rxdb/rxdb"
import { templateCollectionMethods } from "./rxdb/template.orm"
import { dexieMethods } from "./dexie/dexie"
import { templateCollectionMethodsX } from "./sqlite/template"

export const exposed = {
  ...templateCollectionMethods,
  ...templateCollectionMethodsX,
  ...cardCollectionMethods,
  ...noteCollectionMethods,
  ...heroCollectionMethods,
  ...dexieMethods,
  remove,
  sync,
}

const targetOrigin = "*" // highTODO make more limiting. Also implement https://stackoverflow.com/q/8169582
Comlink.expose(exposed, Comlink.windowEndpoint(self.parent, self, targetOrigin))
