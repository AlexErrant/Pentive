import {
	body,
	html,
	renderTemplate,
	strip,
	transformers,
	noteOrds,
	templateIndexes,
} from './cardHtml'
import {
	toastError,
	toastFatal,
	toastImpossible,
	toastInfo,
	toastWarn,
} from './toasts'

export const defaultRenderContainer = {
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
}

export const noteOrdsRenderContainer = {
	...defaultRenderContainer,
	strip: (x: string) => x,
}

export type RenderContainer = typeof defaultRenderContainer

export interface RenderPluginExports {
	services?: (c: RenderContainer) => Partial<RenderContainer>
}
