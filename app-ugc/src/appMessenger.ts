import * as Comlink from "comlink"
import type { AppExpose } from "app/src/components/resizingIframe"

export const appMessenger = Comlink.wrap<AppExpose>(
  Comlink.windowEndpoint(self.parent)
)

// uncommenting this kills updates on the /templates page. lowTODO figure out the right way to dispose the proxy
// addEventListener("unload", () => {
//   appMessenger[Comlink.releaseProxy]()
// })
