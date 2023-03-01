import { MediaId } from "app/src/domain/ids"
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
async function getLocalMedia(id: MediaId): Promise<ArrayBuffer | null> {
  const data = await appMessenger.getLocalMedia(id)
  if (data == null) {
    return data
  } else {
    return Comlink.transfer(data, [data])
  }
}

const exposed = {
  getLocalMedia,
}

export type Exposed = typeof exposed

if ("serviceWorker" in navigator) {
  window.addEventListener("DOMContentLoaded", async () => {
    const registration = await navigator.serviceWorker.register(
      "/service-worker.js"
    )
    if (registration.installing != null) {
      firstServiceWorkerInstall(registration.installing)
    } else {
      const registration = await navigator.serviceWorker.ready
      initComlink(registration.active)
    }
  })
} else {
  alert(
    "Your browser doesn't support Service Workers. Pentive won't work properly without them."
  )
}

function firstServiceWorkerInstall(sw: ServiceWorker): void {
  // https://stackoverflow.com/a/70311720
  sw.onstatechange = function () {
    if (sw.state === "installed") {
      removeEventListener("unload", closeComlink)
      window.location.reload()
    }
  }
  // Don't `initComlink` if installing - it will cause a memory leak in the service worker.
  // `navigator.serviceWorker.controller` in `closeComlink` will be null, making it difficult to communicate with the service worker during `unload`
  // ref: https://web.dev/service-worker-lifecycle/#activate:~:text=You%20can%20detect%20if%20a%20client%20is%20controlled%20via%20navigator.serviceWorker.controller%20which%20will%20be%20null%20or%20a%20service%20worker%20instance
  // This occurs during the first service worker install since the first page load is uncontrolled by the service worker.
  // There's no point to init-ing Comlink for the first install anyway since it's uncontrolled.
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

// https://stackoverflow.com/a/39710575
addEventListener("unload", closeComlink)

function closeComlink(): void {
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
}
