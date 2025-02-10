import type { VoidComponent } from 'solid-js'
import {
	body,
	html,
	renderTemplate,
	strip,
	transformers,
	noteOrds,
	templateIndexes,
} from './cardHtml'
import type { RenderBodyInput } from './resizingIframe'
import {
	toastError,
	toastFatal,
	toastImpossible,
	toastInfo,
	toastWarn,
} from './toasts'

export type CommonResizingIframe = VoidComponent<{
	readonly i: RenderBodyInput
	class?: string
	resize?: false
}>

export const defaultRenderContainer = (args: {
	resizingIframe: CommonResizingIframe
}) => ({
	...args,
	transformers,
	body,
	renderTemplate,
	html,
	strip,
	noteOrds,
	templateIndexes,
	toastError,
	toastFatal,
	toastImpossible,
	toastInfo,
	toastWarn,
})

export type RenderContainer = ReturnType<typeof defaultRenderContainer>
export type RenderContainerArgs = Parameters<typeof defaultRenderContainer>[0]

export const noteOrdsRenderContainer = (args: RenderContainerArgs) => ({
	...defaultRenderContainer(args),
	strip: (x: string) => x,
})

export interface RenderPluginExports {
	services?: (c: RenderContainer) => Partial<RenderContainer>
}
