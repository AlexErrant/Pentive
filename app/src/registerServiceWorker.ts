import { type MediaId } from 'shared'
import * as Comlink from 'comlink' // https://github.com/GoogleChromeLabs/comlink/tree/main/docs/examples/05-serviceworker-example
import { db } from './db'
import { toastError } from './components/toasts'

export interface ComlinkInit {
	type: 'ComlinkInit'
	port: MessagePort
}

export interface ComlinkClose {
	type: 'ComlinkClose'
}

export type PostMessageTypes = ComlinkInit | ComlinkClose

// explicit because Comlink can't clone functions
async function getLocalMedia(id: MediaId): Promise<ArrayBuffer | null> {
	const media = await db.getMedia(id)
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
	const registration = await navigator.serviceWorker.register(
		import.meta.env.MODE === 'production'
			? '/serviceWorker.js'
			: '/dev-sw.js?dev-sw',
		{ type: import.meta.env.MODE === 'production' ? 'classic' : 'module' },
	)
	if (registration.installing != null) {
		firstServiceWorkerInstall(registration.installing)
	} else {
		const registration = await navigator.serviceWorker.ready
		initComlink(registration.active)
	}
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
	toastError(
		"Your browser doesn't support Service Workers. Pentive won't work properly without them.",
	)
}

function firstServiceWorkerInstall(sw: ServiceWorker): void {
	// https://stackoverflow.com/a/70311720
	sw.onstatechange = function () {
		if (sw.state === 'installed') {
			removeEventListener('unload', closeComlink)
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
			"navigator.serviceWorker.ready's `.active` is null - how did this happen?",
		)
	const { port1, port2 } = new MessageChannel()
	const comlinkInit: ComlinkInit = {
		type: 'ComlinkInit',
		port: port1,
	}
	Comlink.expose(expose, port2)
	serviceWorker.postMessage(comlinkInit, [port1])
}

// https://stackoverflow.com/a/39710575
addEventListener('unload', closeComlink)

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
