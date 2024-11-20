import * as Comlink from 'comlink' // https://github.com/GoogleChromeLabs/comlink/tree/main/docs/examples/05-serviceworker-example
import { C } from './topLevelAwait'
import { type MediaId } from 'shared/brand'
import { throwExp } from 'shared/utility'

export interface ComlinkInit {
	type: 'ComlinkInit'
	port: MessagePort
}

export interface ComlinkClose {
	type: 'ComlinkClose'
}

export interface ClaimRequest {
	type: 'ClaimRequest'
}

export type PostMessageTypes = ComlinkInit | ComlinkClose | ClaimRequest

// explicit because Comlink can't clone functions
async function getLocalMedia(id: MediaId): Promise<ArrayBuffer | null> {
	const media = await C.db.getMedia(id)
	if (media == null) {
		return null
	} else {
		const data = media.data
		return Comlink.transfer(data, [data])
	}
}

const expose = {
	getLocalMedia,
}

export type Expose = typeof expose

async function register() {
	await navigator.serviceWorker.register(
		import.meta.env.PROD ? '/serviceWorker.js' : '/dev-sw.js?dev-sw',
		{ type: import.meta.env.MODE === 'production' ? 'classic' : 'module' },
	)
	const registration = await navigator.serviceWorker.ready
	if (registration.active == null) throwExp()
	if (navigator.serviceWorker.controller === null) {
		// This conditional checks if the page has been force refreshed, which typically disables the service worker. This breaks images in prosemirror, so we manually claim the client.
		// "If you force-reload the page (shift-reload) it bypasses the service worker entirely. It'll be uncontrolled. This feature is in the spec, so it works in other service-worker-supporting browsers."
		// https://web.dev/articles/service-worker-lifecycle#shift-reload
		// "navigator.serviceWorker.controller returns null if the request is a force refresh (shift+refresh)."
		// https://www.w3.org/TR/service-workers/#dom-serviceworkercontainer-controller
		// https://stackoverflow.com/a/60133005
		registration.active.postMessage({
			type: 'ClaimRequest',
		} satisfies ClaimRequest)
	}
	initComlink(registration.active)
}

if ('serviceWorker' in navigator) {
	if (document.readyState === 'complete') {
		await register()
	} else {
		// delay registration so it doesn't interfere with initial page render https://web.dev/articles/service-workers-registration#:~:text=Improving%20the%20boilerplate
		window.addEventListener('load', register)
	}
} else {
	// 7A0559B7-44B3-4674-B71C-100DAA30D45C
	C.toastError(
		"Your browser doesn't support Service Workers. Pentive won't work properly without them.",
	)
}

function initComlink(serviceWorker: ServiceWorker): void {
	const { port1, port2 } = new MessageChannel()
	const comlinkInit: ComlinkInit = {
		type: 'ComlinkInit',
		port: port1,
	}
	Comlink.expose(expose, port2)
	serviceWorker.postMessage(comlinkInit, [port1])
}

// https://stackoverflow.com/a/39710575
addEventListener('beforeunload', closeComlink)

function closeComlink(): void {
	const close: ComlinkClose = {
		type: 'ComlinkClose',
	}
	if (navigator.serviceWorker.controller == null) {
		console.warn(
			"`navigator.serviceWorker.controller` is null - how did that happen? This means the `ComlinkClose` message isn't sent, which leaks memory in the service worker!",
		)
	} else {
		navigator.serviceWorker.controller.postMessage(close)
	}
}
