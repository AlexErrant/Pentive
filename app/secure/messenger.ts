import * as Comlink from "comlink"

import { templateCollectionMethods } from "./rxdb/template.orm"

export const exposed = {
  ...templateCollectionMethods,
}

const targetOrigin = "*" // highTODO make more limiting
Comlink.expose(exposed, Comlink.windowEndpoint(self.parent, self, targetOrigin))
