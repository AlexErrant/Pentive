import * as Comlink from "comlink"

const secureRoot = document.querySelector("#secure-root") as HTMLIFrameElement
await new Promise((resolve) => (secureRoot.onload = resolve))
const f = Comlink.wrap<(a: number, b: number) => number>(
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  Comlink.windowEndpoint(secureRoot.contentWindow!)
)
alert(`100 + 3 = ${await f(100, 3)}`)
