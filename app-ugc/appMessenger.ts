import * as Comlink from "comlink"
import type { appExpose } from "app/src/customElements/resizingIframe"

export const appMessenger = Comlink.wrap<typeof appExpose>(
  Comlink.windowEndpoint(self.parent)
)

addEventListener("unload", () => {
  appMessenger[Comlink.releaseProxy]()
})
