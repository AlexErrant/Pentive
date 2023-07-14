import * as Comlink from "comlink"
import type { AppExpose } from "app/src/components/resizingIframe"

export const appMessenger = Comlink.wrap<AppExpose>(
  Comlink.windowEndpoint(self.parent)
)

addEventListener("unload", () => {
  appMessenger[Comlink.releaseProxy]()
})
