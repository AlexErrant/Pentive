import * as Comlink from "comlink"
import { cardCollectionMethods } from "./rxdb/card.orm"
import { templateCollectionMethods } from "./rxdb/template.orm"

export const exposed = {
  ...templateCollectionMethods,
  ...cardCollectionMethods,
}

const targetOrigin = "*" // highTODO make more limiting
Comlink.expose(exposed, Comlink.windowEndpoint(self.parent, self, targetOrigin))
