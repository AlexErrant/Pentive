import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching"
import * as Comlink from "comlink"
import type {
  ComlinkReady,
  Exposed,
  PostMessageTypes,
} from "./registerServiceWorker"
import { MediaId } from "app/src/domain/ids"
import { throwExp } from "shared"

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

async function closeRemaining(): Promise<void> {
  const activeClients = await self.clients.matchAll()
  const activeClientIds = new Set(activeClients.map((c) => c.id))
  Array.from(messengers.keys()).forEach((id) => {
    if (!activeClientIds.has(id)) {
      close(id)
      console.warn(
        `No Client was found for Messenger '${id}', so it was closed. (How did this occur?)`
      )
    }
  })
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

const localMediaPrefix = self.registration.scope + "localMedia/"

async function sleep(ms: number): Promise<void> {
  return await new Promise((resolve) => setTimeout(resolve, ms))
}

async function getLocalMedia(
  mediaId: MediaId,
  clientId: string
): Promise<Response> {
  const messenger = await getMessenger(clientId)
  const media = await messenger.getLocalMedia(mediaId)
  return media == null
    ? new Response(media, { status: 404 })
    : new Response(media)
}

async function getMessenger(
  clientId: string
): Promise<Comlink.Remote<Exposed>> {
  let i = 0
  let m = messengers.get(clientId)
  while (m == null) {
    await closeRemaining() // ensure that we don't get a messenger with a missing Client
    if (messengers.size > 0) {
      const firstClientId = messengers.keys().next().value as string
      console.warn(
        `Client '${clientId}' not found. Defaulting to '${firstClientId}'. This message is expected if you open a resource by itself, i.e. "right click > Open image in new tab".`
      )
      return (
        messengers.get(firstClientId) ??
        throwExp(
          "Impossible because we got it from the `messengers` map above."
        )
      )
    }
    i++
    // console.info("messenger is null - loop ", i)
    if (i > 100) {
      console.error(
        "Messenger has been null for more than 1 second. Are there any active Pentive windows/clients? Was ComlinkInit called?"
      )
    }
    await sleep(10)
    m = messengers.get(clientId)
  }
  return m
}

self.addEventListener("fetch", (fetch) => {
  if (fetch.request.url.startsWith(localMediaPrefix)) {
    const mediaId = decodeURI(
      fetch.request.url.substring(localMediaPrefix.length)
    ) as MediaId
    fetch.respondWith(getLocalMedia(mediaId, fetch.clientId))
  }
})
