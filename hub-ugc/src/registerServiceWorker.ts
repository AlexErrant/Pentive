import * as Comlink from 'comlink' // https://github.com/GoogleChromeLabs/comlink/tree/main/docs/examples/05-serviceworker-example
import { hubMessenger } from './hubMessenger'
import { setBody } from './setBody'
import { type MediaId } from 'shared/brand'

export interface ComlinkInit {
	type: 'ComlinkInit'
	port: MessagePort
}

export interface ComlinkReady {
	type: 'ComlinkReady'
}

export interface ComlinkClose {
	type: 'ComlinkClose'
}

export type PostMessageTypes = ComlinkInit | ComlinkClose

// explicit because Comlink can't clone functions
async function getLocalMedia(id: MediaId): Promise<ArrayBuffer | null> {
	const data = await hubMessenger.getLocalMedia(id)
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

export const resizeIframe = async () => {
	await hubMessenger.resize()
}

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
	alert(
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
	Comlink.expose(exposed, port2)
	serviceWorker.postMessage(comlinkInit, [port1])
	port2.onmessage = async (e) => {
		const data = e.data as ComlinkReady | null // force a null check in case some other message occurs
		if (data?.type === 'ComlinkReady') {
			const i = await hubMessenger.rawRenderBodyInput
			await setBody(i)
			await resizeIframe()
		}
	}
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
