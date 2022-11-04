import { ResourceId } from "app/src/domain/ids"
import * as Comlink from "comlink" // https://github.com/GoogleChromeLabs/comlink/tree/main/docs/examples/05-serviceworker-example
import { appMessenger } from "../appMessenger"
import { setBody } from "./setBody"

export interface ComlinkInit {
  type: "ComlinkInit"
  port: MessagePort
}

export interface ComlinkReady {
  type: "ComlinkReady"
}

export interface ComlinkClose {
  type: "ComlinkClose"
}

export type PostMessageTypes = ComlinkInit | ComlinkClose

// explicit because Comlink can't clone functions
async function getLocalResource(id: ResourceId): Promise<ArrayBuffer | null> {
  const data = await appMessenger.getLocalResource(id)
  if (data == null) {
    return data
  } else {
    return Comlink.transfer(data, [data])
  }
}

const exposed = {
  getLocalResource,
}

export type Exposed = typeof exposed

if ("serviceWorker" in navigator) {
  window.addEventListener("DOMContentLoaded", async () => {
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
  port2.onmessage = async (e) => {
    const data = e.data as ComlinkReady | null // force a null check in case some other message occurs
    if (data?.type === "ComlinkReady") {
      await setBody()
    }
  }
}

addEventListener("beforeunload", () => {
  const close: ComlinkClose = {
    type: "ComlinkClose",
  }
  if (navigator.serviceWorker.controller == null) {
    console.warn(
      "`navigator.serviceWorker.controller` is null - how did that happen? This means the `ComlinkClose` message isn't sent, which leaks memory in the service worker!"
    )
  } else {
    navigator.serviceWorker.controller.postMessage(close)
  }
})
