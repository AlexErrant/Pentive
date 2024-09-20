import { type IFrameComponent } from 'iframe-resizer'
import { type SetStoreFunction, unwrap } from 'solid-js/store'
import {
	type Diagnostics,
	ResizingIframe as CoreResizingIframe,
	defaultRenderContainer,
	type RenderBodyInput,
	type RawRenderBodyInput,
	type ComlinkInit,
	buildHtml,
	type RenderContainer,
	type CommonResizingIframe,
} from 'shared-dom'
import { type MediaId } from 'shared'

export type { RenderBodyInput, RawRenderBodyInput, ComlinkInit }

// lowTODO dedupe requests
async function getLocalMedia(id: MediaId): Promise<ArrayBuffer | null> {
	const response = await fetch(import.meta.env.VITE_AUGC_URL + 'i/' + id)
	return await response.arrayBuffer()
}

export interface HubExpose {
	renderTemplate: RenderContainer['renderTemplate']
	html: RenderContainer['html']
	getLocalMedia: typeof getLocalMedia
	rawRenderBodyInput: RawRenderBodyInput
	resize: () => void
}

const ResizingIframe: CommonResizingIframe = (props) => {
	const C = defaultRenderContainer({
		// @ts-expect-error don't recurse
		resizingIframe: null,
	})
	// eslint-disable-next-line solid/reactivity
	const resize = (iframeReference?: IFrameComponent) => () => {
		if (props.resize === false) return
		iframeReference?.iFrameResizer?.resize()
	}
	const html = (setDiagnostics: SetStoreFunction<Diagnostics>) =>
		buildHtml(C, unwrap(props.i), setDiagnostics) satisfies RawRenderBodyInput
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
		}) satisfies HubExpose as Record<string, unknown>
	return (
		<CoreResizingIframe
			C={C}
			i={props.i}
			class={props.class}
			resize={props.resize}
			resizeFn={resize}
			origin={import.meta.env.VITE_HUB_UGC_ORIGIN}
			html={html}
			expose={appExpose}
		/>
	)
}

export default ResizingIframe
