// @refresh reload
import { mount, StartClient } from '@solidjs/start/client'
import type { appExpose } from 'app/hubMessenger'
import * as Comlink from 'comlink'
import { retryWithTimeout, throwExp } from 'shared/utility'

let appMessenger: Comlink.Remote<typeof appExpose> | null

export async function getAppMessenger() {
	if (appMessenger == null) {
		const pai = document.getElementById(
			'pentive-app-iframe',
		) as HTMLIFrameElement
		if (pai.contentWindow == null) throwExp() // Unable to find the pentive app iframe.
		appMessenger = Comlink.wrap<typeof appExpose>(
			Comlink.windowEndpoint(pai.contentWindow),
		)
		let messengerReady = false
		while (!messengerReady) {
			const timeoutMs = 50
			const failoutMs = 30_000
			const count = failoutMs / timeoutMs
			await retryWithTimeout(appMessenger.ping, count, timeoutMs)
			messengerReady = true
		}
	}
	return appMessenger
}

mount(() => <StartClient />, document.getElementById('app')!)

// if (import.meta.env.PROD && "serviceWorker" in navigator) {
//   // Use the window load event to keep the page load performant
//   window.addEventListener("load", () => {
//     navigator.serviceWorker.register(`/sw.js`);
//   });
// }
