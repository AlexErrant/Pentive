// This file generates the test plugin code in `cardHtml.plugin.test.ts`
// You can re-generate via
// npx tsc .\cardHtml.plugin.testinput.ts
import {
	type defaultRenderContainer,
	type RenderContainer,
	type RenderPluginExports,
} from './renderContainer'

function renderTemplate(
	c: RenderContainer,
): typeof defaultRenderContainer.renderTemplate {
	return function (template) {
		const original = c.renderTemplate.bind(this)(template)
		return original.map((x) =>
			x !== null ? ([x[0].toUpperCase(), x[1].toUpperCase()] as const) : null,
		)
	}
}

const services = (c: RenderContainer): Partial<RenderContainer> => {
	return {
		renderTemplate: renderTemplate(c),
	}
}

const exports: RenderPluginExports = {
	services,
}

export default exports
