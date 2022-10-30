import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching"
import * as Comlink from "comlink"
import type { ComlinkInit, Exposed } from "./register-service-worker"
import type { ResourceId } from "app/src/domain/ids"

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)

let messenger: Comlink.Remote<Exposed> | null = null

self.addEventListener("message", (event) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (event.data.type === "ComlinkInit") {
    const { port } = event.data as ComlinkInit
    messenger = Comlink.wrap<Exposed>(port)
  }
})

const localResourcePrefix = self.registration.scope + "localResource/"

async function sleep(ms: number): Promise<void> {
  return await new Promise((resolve) => setTimeout(resolve, ms))
}

async function getLocalResource(resourceId: ResourceId): Promise<Response> {
  let i = 0
  // eslint-disable-next-line no-unmodified-loop-condition
  while (messenger == null) {
    i++
    // console.info("messenger is null - loop ", i)
    if (i > 100) {
      console.error(
        "Messenger has been null for more than 1 second. Was ComlinkInit called?"
      )
    }
    await sleep(10)
  }
  const resource = await messenger.getLocalResource(resourceId)
  return resource == null
    ? new Response(resource, { status: 404 })
    : new Response(resource)
}

self.addEventListener("fetch", (fetch) => {
  if (fetch.request.url.startsWith(localResourcePrefix)) {
    const resourceId = decodeURI(
      fetch.request.url.substring(localResourcePrefix.length)
    ) as ResourceId
    fetch.respondWith(getLocalResource(resourceId))
  }
})
