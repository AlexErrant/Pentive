import { type IFrameComponent } from 'iframe-resizer'
import { type VoidComponent } from 'solid-js'
import { type MediaId, assertNever } from 'shared'
import { type SetStoreFunction, unwrap } from 'solid-js/store'
import { db } from '../db'
import { C } from '../topLevelAwait'
import {
	type HtmlResult,
	type RawRenderBodyInput,
	type RenderBodyInput,
	ResizingIframe as CoreResizingIframe,
	type Diagnostics,
	type ComlinkInit,
} from 'shared-dom'

export type { RawRenderBodyInput, ComlinkInit }

async function getLocalMedia(id: MediaId): Promise<ArrayBuffer | null> {
	const media = await db.getMedia(id)
	return media?.data ?? null
}

export interface AppExpose {
	renderTemplate: typeof C.renderTemplate
	html: typeof C.html
	getLocalMedia: typeof getLocalMedia
	rawRenderBodyInput: RawRenderBodyInput
	resize: () => void
}

const ResizingIframe: VoidComponent<{
	readonly i: RenderBodyInput
	class?: string
	resize?: false
}> = (props) => {
	// eslint-disable-next-line solid/reactivity
	const resize = (iframeReference?: IFrameComponent) => () => {
		if (props.resize === false) return
		iframeReference?.iFrameResizer?.resize()
	}
	const html = (setDiagnostics: SetStoreFunction<Diagnostics>) =>
		buildHtml(unwrap(props.i), setDiagnostics) satisfies RawRenderBodyInput
	const appExpose = (
		setDiagnostics: SetStoreFunction<Diagnostics>,
		iframeReference: IFrameComponent | undefined,
	) =>
		({
			renderTemplate: (x) => C.renderTemplate(x), // do not eta-reduce. `C`'s `this` binding apparently doesn't work across Comlink
			html: (x, y, z) => C.html(x, y, z), // do not eta-reduce. `C`'s `this` binding apparently doesn't work across Comlink
			getLocalMedia,
			rawRenderBodyInput: html(setDiagnostics),
			resize: resize(iframeReference),
		}) satisfies AppExpose as Record<string, unknown>
	return (
		<CoreResizingIframe
			C={C}
			i={props.i}
			class={props.class}
			resize={props.resize}
			resizeFn={resize}
			origin={import.meta.env.VITE_APP_UGC_ORIGIN}
			html={html}
			expose={appExpose}
		/>
	)
}

export default ResizingIframe

function getOk(
	htmlResult: HtmlResult | null | undefined,
	setDiagnostics: SetStoreFunction<Diagnostics>,
) {
	if (htmlResult?.tag === 'Ok') {
		setDiagnostics({ warnings: htmlResult.warnings, errors: [] })
		return htmlResult.ok
	} else if (htmlResult?.tag === 'Error') {
		setDiagnostics({ errors: htmlResult?.errors, warnings: [] })
	}
	return null
}

function buildHtml(
	i: RenderBodyInput,
	setDiagnostics: SetStoreFunction<Diagnostics>,
): RawRenderBodyInput {
	switch (i.tag) {
		case 'template': {
			const template = i.template
			const result = getOk(C.renderTemplate(template)[i.index], setDiagnostics)
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
			const frontBack = getOk(
				C.html(i.card, i.note, i.template),
				setDiagnostics,
			)
			if (frontBack == null) {
				return { body: 'Card is invalid!' }
			}
			const body = i.side === 'front' ? frontBack[0] : frontBack[1]
			return { body }
		}
		case 'raw': {
			return { body: i.html, css: i.css }
		}
		default:
			return assertNever(i)
	}
}
