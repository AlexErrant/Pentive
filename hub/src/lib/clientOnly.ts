// these functions should only be used from `clientOnly` components!

import type { appExpose } from 'app/hubMessenger'
import * as Comlink from 'comlink'
import { retryWithTimeout, sleep, throwExp } from 'shared/utility'

let appMessenger: Comlink.Remote<typeof appExpose> | null
let messengerReady = false

export async function getAppMessenger() {
	const timeoutMs = 50
	const failoutMs = 30_000
	const count = failoutMs / timeoutMs
	if (appMessenger == null) {
		const pai = document.getElementById(
			'pentive-app-iframe',
		) as HTMLIFrameElement
		if (pai.contentWindow == null) throwExp() // Unable to find the pentive app iframe.
		appMessenger = Comlink.wrap<typeof appExpose>(
			Comlink.windowEndpoint(pai.contentWindow),
		)
		while (!messengerReady) {
			await retryWithTimeout(appMessenger.ping, count, timeoutMs)
			messengerReady = true
		}
	} else if (!messengerReady) {
		let i = 0
		// eslint-disable-next-line no-unmodified-loop-condition
		while (!messengerReady && i <= count) {
			i++
			await sleep(timeoutMs)
		}
		if (i === count) throwExp('Cannot connect to appMessenger')
	}
	return appMessenger
}
