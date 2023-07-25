import * as Comlink from "comlink"
import type { HubExpose } from "hub/src/components/resizingIframe"

export const hubMessenger = Comlink.wrap<HubExpose>(
  Comlink.windowEndpoint(self.parent)
)

// grep A08D0084-685D-4359-9949-3EAAEC5CC979
// addEventListener("unload", () => {
//   hubMessenger[Comlink.releaseProxy]()
// })
