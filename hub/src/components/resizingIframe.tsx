import { type IFrameComponent } from 'iframe-resizer'
import { type VoidComponent } from 'solid-js'
import { type SetStoreFunction, unwrap } from 'solid-js/store'
import {
	type Diagnostics,
	defaultRenderContainer,
	type RenderBodyInput,
	type RawRenderBodyInput,
	type ComlinkInit,
	buildHtml,
	type RenderContainer,
} from 'shared-dom'
import { ResizingIframe as CoreResizingIframe } from 'shared-dom'

export type { RenderBodyInput, RawRenderBodyInput, ComlinkInit }

export interface HubExpose {
	renderTemplate: RenderContainer['renderTemplate']
	html: RenderContainer['html']
	rawRenderBodyInput: RawRenderBodyInput
	resize: () => void
}

const ResizingIframe: VoidComponent<{
	readonly i: RenderBodyInput
	class?: string
	resize?: false
}> = (props) => {
	const C = defaultRenderContainer
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
