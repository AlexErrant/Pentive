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
		transformers: new Map(c.transformers).set(
			'edit',
			({ initialValue }) => '[EDITABLE]' + initialValue + '[/EDITABLE]',
		),
	}
}

const exports: RenderPluginExports = {
	services,
}

export default exports
