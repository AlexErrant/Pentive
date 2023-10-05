import * as Comlink from 'comlink'
import type { AppExpose } from 'app/src/components/resizingIframe'

export let appMessenger = Comlink.wrap<AppExpose>(
	Comlink.windowEndpoint(self.parent),
)

// This exists because without it, on pages that have multiple `ResizingIframes`, we query the db multiple times for the same media binary.
// I _think_ that occurs because communicating via `Comlink.windowEndpoint` is nonspecific. Using a MessagePort makes it specific.
// However, we default to `Comlink.windowEndpoint` above so that we can communicate on initial pageload immediately,
// rather than having to wait for `ComlinkInit`.
export function setAppMessengerPort(port: MessagePort) {
	appMessenger = Comlink.wrap<AppExpose>(port)
}

// uncommenting this kills updates on the /templates page. lowTODO figure out the right way to dispose the proxy. Grep A08D0084-685D-4359-9949-3EAAEC5CC979
// addEventListener("unload", () => {
//   appMessenger[Comlink.releaseProxy]()
// })
