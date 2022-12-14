// https://github.com/GoogleChromeLabs/comlink/issues/37
// This file and the `#secure-root` iframe must be loaded before the app is loaded!

import * as Comlink from "comlink"
import { exposed } from "../secure/messenger"

const secureRoot = document.querySelector("#secure-root") as HTMLIFrameElement
await new Promise((resolve) => (secureRoot.onload = resolve))

export const db = Comlink.wrap<typeof exposed>(
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  Comlink.windowEndpoint(secureRoot.contentWindow!)
)
