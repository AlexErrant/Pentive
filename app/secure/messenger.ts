import * as Comlink from "comlink"
import { cardCollectionMethods } from "./rxdb/card.orm"
import { heroCollectionMethods } from "./rxdb/hero.orm"
import { templateCollectionMethods } from "./rxdb/template.orm"

export const exposed = {
  ...templateCollectionMethods,
  ...cardCollectionMethods,
  ...heroCollectionMethods,
}

const targetOrigin = "*" // highTODO make more limiting. Also implement https://stackoverflow.com/q/8169582
Comlink.expose(exposed, Comlink.windowEndpoint(self.parent, self, targetOrigin))
