import * as Comlink from "comlink"
import { cardCollectionMethods } from "./rxdb/card.orm"
import { heroCollectionMethods } from "./rxdb/hero.orm"
import { noteCollectionMethods } from "./rxdb/note.orm"
import { pluginCollectionMethods } from "./rxdb/plugin.orm"
import { remove, sync } from "./rxdb/rxdb"
import { templateCollectionMethods } from "./rxdb/template.orm"
import { resourceCollectionMethods } from "./rxdb/resource.orm"

export const exposed = {
  ...templateCollectionMethods,
  ...resourceCollectionMethods,
  ...cardCollectionMethods,
  ...noteCollectionMethods,
  ...heroCollectionMethods,
  ...pluginCollectionMethods,
  remove,
  sync,
}

const targetOrigin = "*" // highTODO make more limiting. Also implement https://stackoverflow.com/q/8169582
Comlink.expose(exposed, Comlink.windowEndpoint(self.parent, self, targetOrigin))
