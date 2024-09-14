import contentWindowJs from 'iframe-resizer/js/iframeResizer.contentWindow.js?raw' // https://vitejs.dev/guide/assets.html#importing-asset-as-string https://github.com/davidjbradshaw/iframe-resizer/issues/513
import { setAppMessengerPort } from './appMessenger'
import {
	type ComlinkInit,
	type RawRenderBodyInput,
} from 'app/components/resizingIframe'
import { resizeIframe } from './registerServiceWorker'
import diff from 'micromorph'

self.addEventListener('message', async (event) => {
	const data = event.data as unknown
	if (typeof data === 'object' && data != null && 'type' in data) {
		if (data.type === 'pleaseRerender') {
			// @ts-expect-error i exists; grep pleaseRerender
			const i = data.i as RawRenderBodyInput
			await setBody(i)
			await resizeIframe()
		} else if (data?.type === 'ComlinkInit') {
			setAppMessengerPort((data as ComlinkInit).port)
		}
	}
})

const domParser = new DOMParser()

export async function setBody({ body, css }: RawRenderBodyInput) {
	await diff(document, domParser.parseFromString(body, 'text/html'))
	const resizeScript = document.createElement('script')
	resizeScript.type = 'text/javascript'
	resizeScript.text = contentWindowJs
	document.head.appendChild(resizeScript)
	if (css != null) {
		const style = document.createElement('style')
		style.textContent = css
		document.head.appendChild(style)
	}
}
