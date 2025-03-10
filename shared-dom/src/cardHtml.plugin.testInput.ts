import type { RenderContainer, RenderPluginExports } from './renderContainer'

function renderTemplate(c: RenderContainer): RenderContainer['renderTemplate'] {
	return function (template) {
		const original = c.renderTemplate.bind(this)(template)
		return original.map((r) => {
			if (r.tag === 'Error') return r
			return {
				tag: 'Ok',
				ok:
					r.ok !== null
						? ([r.ok[0].toUpperCase(), r.ok[1].toUpperCase()] as const)
						: null,
				warnings: r.warnings,
			}
		})
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
