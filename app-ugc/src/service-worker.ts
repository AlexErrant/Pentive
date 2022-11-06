import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching"
import * as Comlink from "comlink"
import type {
  ComlinkReady,
  Exposed,
  PostMessageTypes,
} from "./register-service-worker"
import type { ResourceId } from "app/src/domain/ids"

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)

const messengers = new Map<string, Comlink.Remote<Exposed>>()

function getId(event: ExtendableMessageEvent): string {
  if (event.source instanceof Client) {
    return event.source.id
  }
  console.error("Expected a Client, but got a ", event)
  throw new Error("Expected a Client, but didn't get one.")
}

function close(clientId: string): void {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const messenger = messengers.get(clientId)!
  messenger[Comlink.releaseProxy]()
  messengers.delete(clientId)
}

self.addEventListener("message", (event) => {
  const data = event.data as PostMessageTypes | null // force a null check in case some other message occurs
  if (data?.type === "ComlinkInit") {
    const id = getId(event)
    if (messengers.has(id)) {
      console.warn(
        "Got `ComlinkInit` for an `id` that's already registered. How did that happen?"
      )
      close(id)
    }
    messengers.set(id, Comlink.wrap<Exposed>(data.port))
    const ready: ComlinkReady = { type: "ComlinkReady" }
    data.port.postMessage(ready)
  } else if (data?.type === "ComlinkClose") {
    const id = getId(event)
    if (messengers.has(id)) {
      close(id)
    } else {
      console.warn(
        "Got `ComlinkClose`, but the `id` didn't exist in `messengers`. How did that happen?"
      )
    }
  }
})

const localResourcePrefix = self.registration.scope + "localResource/"

async function sleep(ms: number): Promise<void> {
  return await new Promise((resolve) => setTimeout(resolve, ms))
}

async function getLocalResource(
  resourceId: ResourceId,
  clientId: string
): Promise<Response> {
  const messenger = await getMessenger(clientId)
  const resource = await messenger.getLocalResource(resourceId)
  return resource == null
    ? new Response(resource, { status: 404 })
    : new Response(resource)
}

async function getMessenger(
  clientId: string
): Promise<Comlink.Remote<Exposed>> {
  let i = 0
  let m = messengers.get(clientId)
  while (m == null) {
    i++
    // console.info("messenger is null - loop ", i)
    if (i > 100) {
      console.error(
        "Messenger has been null for more than 1 second. Was ComlinkInit called?"
      )
    }
    await sleep(10)
    m = messengers.get(clientId)
  }
  return m
}

self.addEventListener("fetch", (fetch) => {
  if (fetch.request.url.startsWith(localResourcePrefix)) {
    const resourceId = decodeURI(
      fetch.request.url.substring(localResourcePrefix.length)
    ) as ResourceId
    fetch.respondWith(getLocalResource(resourceId, fetch.clientId))
  }
})
