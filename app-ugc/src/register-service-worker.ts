import * as Comlink from "comlink" // https://github.com/GoogleChromeLabs/comlink/tree/main/docs/examples/05-serviceworker-example
import { appMessenger } from "../appMessenger"

export interface ComlinkInit {
  type: "ComlinkInit"
  port: MessagePort
}

// explicit because Comlink can't clone functions
async function getLocalResource(id: string): Promise<Blob> {
  return await appMessenger.getLocalResource(id)
}

const exposed = {
  getLocalResource,
}

export type Exposed = typeof exposed

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    await navigator.serviceWorker.register("/service-worker.js")
    const registration = await navigator.serviceWorker.ready
    initComlink(registration.active)
  })
}

function initComlink(serviceWorker: ServiceWorker | null): void {
  if (serviceWorker == null)
    throw new Error(
      "navigator.serviceWorker.ready's `.active` is null - how did this happen?"
    )
  const { port1, port2 } = new MessageChannel()
  const comlinkInit: ComlinkInit = {
    type: "ComlinkInit",
    port: port1,
  }
  Comlink.expose(exposed, port2)
  serviceWorker.postMessage(comlinkInit, [port1])
}
