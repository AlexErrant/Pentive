import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import * as Comlink from 'comlink'
import type {
	ComlinkReady,
	Exposed,
	PostMessageTypes,
} from './registerServiceWorker'
import type { MediaId } from 'shared/brand'
import { sleep, throwExp } from 'shared/utility'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)

type Messenger = Comlink.Remote<Exposed>
const messengers = new Map<string, Messenger>()

function getId(event: ExtendableMessageEvent): string {
	if (event.source instanceof Client) {
		return event.source.id
	}
	console.error('Expected a Client, but got a ', event)
	throw new Error("Expected a Client, but didn't get one.")
}

function close(clientId: string): void {
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
				`No Client was found for Messenger '${id}', so it was closed. (How did this occur?)`,
			)
		}
	})
}

self.onmessage = (event) => {
	const data = event.data as PostMessageTypes | null // force a null check in case some other message occurs
	if (data?.type === 'ComlinkInit') {
		const id = getId(event)
		if (messengers.has(id)) {
			console.warn(
				"Got `ComlinkInit` for an `id` that's already registered. How did that happen?",
			)
			close(id)
		}
		messengers.set(id, Comlink.wrap<Exposed>(data.port))
		const ready: ComlinkReady = { type: 'ComlinkReady' }
		data.port.postMessage(ready)
	} else if (data?.type === 'ComlinkClose') {
		const id = getId(event)
		if (messengers.has(id)) {
			close(id)
		} else {
			console.warn(
				"Got `ComlinkClose`, but the `id` didn't exist in `messengers`. How did that happen?",
			)
		}
	}
}

async function getLocalMediaResponse(
	mediaId: MediaId,
	clientId: string,
): Promise<Response> {
	const messenger = await getMessenger(clientId)
	if (messenger == null) {
		return new Response(null, { status: 404 }) // lowTODO could return an image saying the messenger is null
	}
	const media = await getLocalMedia(messenger, mediaId)
	return media == null
		? new Response(media, { status: 404 })
		: new Response(media, {
				headers: {
					// "image" seems like a valid content-type https://stackoverflow.com/a/28390633
					'content-type': mediaId.endsWith('.svg') ? 'image/svg+xml' : 'image',
					'cache-control': 'max-age=604800, immutable', // 7 days
				},
			})
}

async function getMessenger(clientId: string) {
	let i = 0
	let m = messengers.get(clientId)
	while (m == null) {
		await closeRemaining() // ensure that we don't get a messenger with a missing Client
		if (messengers.size > 0) {
			const firstClientId = messengers.keys().next().value!
			console.warn(
				`Client '${clientId}' not found. Defaulting to '${firstClientId}'. This message is expected if you open a resource by itself, i.e. "right click > Open image in new tab".`,
			)
			return (
				messengers.get(firstClientId) ?? throwExp() // Impossible because we got it from the `messengers` map above.
			)
		}
		i++
		// console.info("messenger is null - loop ", i)
		if (i > 100) {
			console.error(
				'Messenger has been null for more than 1 second. Are there any active Pentive windows/clients? Was ComlinkInit called?',
			)
			break
		}
		await sleep(10)
		m = messengers.get(clientId)
	}
	return m
}

self.addEventListener('fetch', (fetch) => {
	if (fetch.request.url.startsWith(self.location.origin + '/')) {
		const mediaId = decodeURI(
			fetch.request.url.substring(self.location.origin.length + 1),
		) as MediaId
		fetch.respondWith(getLocalMediaResponse(mediaId, fetch.clientId))
	}
})

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management#weakrefs_and_finalizationregistry in particular
// https://github.com/mdn/content/blob/50a5ce565b2fa0b988b3f5ff90ea4b24b13e4b9d/files/en-us/web/javascript/memory_management/index.md?plain=1#L270-L293
// A Map from string URLs to WeakRefs of results
const cache = new Map<MediaId, WeakRef<ArrayBuffer>>()
// Every time after a value is garbage collected, the callback is
// called with the key in the cache as argument, allowing us to remove
// the cache entry
const registry = new FinalizationRegistry((key: MediaId) => {
	// Note: it's important to test that the WeakRef is indeed empty.
	// Otherwise, the callback may be called after a new object has been
	// added with this key, and that new, alive object gets deleted
	if (cache.get(key)?.deref() == null) {
		cache.delete(key)
	}
})
async function getLocalMedia(messenger: Messenger, key: MediaId) {
	if (cache.has(key)) {
		console.info('WeakRef cache hit on ' + key)
		return cache.get(key)!.deref()!
	}
	const value = await messenger.getLocalMedia(key)
	if (value == null) return null
	cache.set(key, new WeakRef(value))
	registry.register(value, key)
	return value
}

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim())
})
