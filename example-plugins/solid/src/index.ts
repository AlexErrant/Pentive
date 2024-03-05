import type { Container, PluginExports } from 'app/src/services'
import { Nav } from './nav'
import ExamplePlugin from './examplePlugin'

function clozeTemplateRegex(c: Container): RegExp {
	return new RegExp(
		c.clozeTemplateRegex.source.replace('cloze:', '(?:edit:)?cloze:'),
		c.clozeTemplateRegex.flags,
	)
}

const services = (c: Container): Partial<Container> => {
	return {
		clozeTemplateRegex: clozeTemplateRegex(c),
		transformers: new Map(c.transformers).set(
			'edit',
			({ initialValue, isFront, card, note, template }) => {
				let r = initialValue
				note.fieldValues.forEach((value, fieldName) => {
					r = r.replace(new RegExp(`{{(?:edit:)?${fieldName}}}`), value)
				})
				return r
			},
		),
		nav: Nav,
		examplePlugin: ExamplePlugin,
	}
}

const exports: PluginExports = {
	services,
}

export default exports
