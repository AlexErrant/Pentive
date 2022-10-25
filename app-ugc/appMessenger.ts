import * as Comlink from "comlink"
import type { appExpose } from "app/src/appMessenger"

export const appMessenger = Comlink.wrap<typeof appExpose>(
  Comlink.windowEndpoint(self.parent)
)
