import * as Comlink from "comlink"
import { exposed } from "../secure/messenger"

const secureRoot = document.querySelector("#secure-root") as HTMLIFrameElement
await new Promise((resolve) => (secureRoot.onload = resolve))

export const db = Comlink.wrap<typeof exposed>(
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  Comlink.windowEndpoint(secureRoot.contentWindow!)
)
