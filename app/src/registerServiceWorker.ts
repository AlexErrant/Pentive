import { type MediaId } from 'shared'
import * as Comlink from 'comlink' // https://github.com/GoogleChromeLabs/comlink/tree/main/docs/examples/05-serviceworker-example
import { db } from './db'
import { C } from './topLevelAwait'

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
	await navigator.serviceWorker.register(
		import.meta.env.PROD ? '/serviceWorker.js' : '/dev-sw.js?dev-sw',
		{ type: import.meta.env.MODE === 'production' ? 'classic' : 'module' },
	)
	const registration = await navigator.serviceWorker.ready
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
