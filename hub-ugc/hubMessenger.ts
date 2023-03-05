import * as Comlink from "comlink"
import type { HubExpose } from "hub/src/components/resizingIframe"

export const hubMessenger = Comlink.wrap<HubExpose>(
  Comlink.windowEndpoint(self.parent)
)

addEventListener("unload", () => {
  hubMessenger[Comlink.releaseProxy]()
})
