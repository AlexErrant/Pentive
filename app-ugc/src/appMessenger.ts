import * as Comlink from "comlink"
import type { AppExpose } from "app/src/components/resizingIframe"
import { setBody } from "./setBody"
import { resizeIframe } from "./registerServiceWorker"

export const appMessenger = Comlink.wrap<AppExpose>(
  Comlink.windowEndpoint(self.parent)
)

self.addEventListener("message", async (event) => {
  const data = event.data as unknown
  if (
    typeof data === "object" &&
    data != null &&
    "type" in data &&
    data.type === "pleaseRerender"
  ) {
    await setBody()
    await resizeIframe()
  }
})

addEventListener("unload", () => {
  appMessenger[Comlink.releaseProxy]()
})
