import { setHubMessengerPort } from './hubMessenger'
import {
	type ComlinkInit,
	type RawRenderBodyInput,
} from 'hub/src/components/resizingIframe'
import { resizeIframe } from './registerServiceWorker'
import diff from 'micromorph'
import '@iframe-resizer/child'

self.onmessage = async (event) => {
	const data = event.data as unknown
	if (typeof data === 'object' && data != null && 'type' in data) {
		if (data.type === 'pleaseRerender') {
			// @ts-expect-error i exists; grep pleaseRerender
			const i = data.i as RawRenderBodyInput
			await setBody(i)
			await resizeIframe()
		} else if (data?.type === 'ComlinkInit') {
			setHubMessengerPort((data as ComlinkInit).port)
		}
	}
}

const domParser = new DOMParser()

export async function setBody({ body, css }: RawRenderBodyInput) {
	await diff(document, domParser.parseFromString(body, 'text/html'))
	if (css != null) {
		const style = document.createElement('style')
		style.textContent = css
		document.head.appendChild(style)
	}
}
