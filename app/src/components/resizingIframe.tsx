import { type IFrameComponent } from 'iframe-resizer'
import { type VoidComponent } from 'solid-js'
import { type MediaId } from 'shared'
import { type SetStoreFunction, unwrap } from 'solid-js/store'
import { db } from '../db'
import { C } from '../topLevelAwait'
import {
	type RawRenderBodyInput,
	type RenderBodyInput,
	ResizingIframe as CoreResizingIframe,
	type Diagnostics,
	type ComlinkInit,
	buildHtml,
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
