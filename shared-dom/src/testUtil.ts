import {
	type RenderContainerArgs,
	defaultRenderContainer as defaultRenderContainerOg,
} from './renderContainer'

export const testRenderContainerArgs: RenderContainerArgs = {
	// @ts-expect-error unused by tests
	resizingIframe: null,
}

export const defaultRenderContainer = defaultRenderContainerOg(
	testRenderContainerArgs,
)
