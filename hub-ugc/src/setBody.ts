import contentWindowJs from 'iframe-resizer/js/iframeResizer.contentWindow.js?raw' // https://vitejs.dev/guide/assets.html#importing-asset-as-string https://github.com/davidjbradshaw/iframe-resizer/issues/513
import { type RenderBodyInput } from 'hub/src/components/resizingIframe'
import { assertNever, relativeChar } from 'shared'
import { registerPluginServices } from 'shared-dom'

const C = await registerPluginServices([])

self.addEventListener('message', (event) => {
	const data = event.data as unknown
	if (
		typeof data === 'object' &&
		data != null &&
		'type' in data &&
		data.type === 'pleaseRerender'
	) {
		// @ts-expect-error i exists; grep pleaseRerender
		const i = data.i as RenderBodyInput
		setBody(i)
	}
})

function relativeImgSrcQueriesCWA(body: string) {
	const doc = new DOMParser().parseFromString(body, 'text/html')
	for (const i of doc.images) {
		const src = i.getAttribute('src')
		if (src != null && src.startsWith(relativeChar)) {
			i.setAttribute('src', import.meta.env.VITE_AUGC_URL + 'i' + src)
		}
	}
	return doc.body.innerHTML
}

export function setBody(i: RenderBodyInput) {
	const { body, css } = buildHtml(i)

	document.getElementsByTagName('body')[0]!.innerHTML =
		relativeImgSrcQueriesCWA(body)
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

function buildHtml(i: RenderBodyInput): { body: string; css?: string } {
	switch (i.tag) {
		case 'template': {
			const template = i.template
			const result = C.renderTemplate(template)[i.index]
			if (result == null) {
				return {
					body: `Error rendering Template #${i.index}".`,
					css: template.css,
				}
			} else {
				return {
					body: i.side === 'front' ? result[0] : result[1],
					css: template.css,
				}
			}
		}
		case 'card': {
			const frontBack = C.html(i.card, i.note, i.template)
			if (frontBack == null) {
				return { body: 'Card is invalid!' }
			}
			const body = i.side === 'front' ? frontBack[0] : frontBack[1]
			return { body }
		}
		default:
			return assertNever(i)
	}
}
