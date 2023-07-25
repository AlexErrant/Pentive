import * as Comlink from "comlink"
import type { AppExpose } from "app/src/components/resizingIframe"

export const appMessenger = Comlink.wrap<AppExpose>(
  Comlink.windowEndpoint(self.parent)
)

// uncommenting this kills updates on the /templates page. lowTODO figure out the right way to dispose the proxy. Grep A08D0084-685D-4359-9949-3EAAEC5CC979
// addEventListener("unload", () => {
//   appMessenger[Comlink.releaseProxy]()
// })
