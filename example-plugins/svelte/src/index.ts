import type { Container, PluginExports } from 'app/lib/src/services'
import App from './App.svelte'
import { createEffect, type Setter, type VoidComponent } from 'solid-js'
import ExamplePlugin from './ExamplePlugin.svelte'
import { Router } from '@solidjs/router'
import { createComponent } from 'solid-js/web'

function clozeTemplateRegex(c: Container): RegExp {
	return new RegExp(
		c.clozeTemplateRegex.source.replace('cloze:', '(?:edit:)?cloze:'),
		c.clozeTemplateRegex.flags,
	)
}

const services = (c: Container): Partial<Container> => {
	return {
		clozeTemplateRegex: clozeTemplateRegex(c),
		replacers: new Map(c.replacers).set(
			'editFieldReplacer',
			({ initialValue, isFront, card, note, template }) => {
				let r = initialValue
				note.fieldValues.forEach((value, fieldName) => {
					r = r.replace(new RegExp(`{{(?:edit:)?${fieldName}}}`), value)
				})
				return r
			},
		),
		nav: (props) =>
			createComponent(Router, {
				get children() {
					const div = document.createElement('div')
					// eslint-disable-next-line no-new -- svelte API requires that we side effect
					new App({
						target: div,
						props,
					})
					return div
				},
			}),
		examplePlugin,
	}
}

const exports: PluginExports = {
	services,
}

export default exports

const examplePlugin: VoidComponent<{
	count: number
	setCount: Setter<number>
	child: VoidComponent<{ count: number; setCount: Setter<number> }>
}> = (props) => {
	const div = document.createElement('div')
	const examplePlugin = new ExamplePlugin({
		target: div,
		props: {
			count: props.count,
			solidProps: props,
		},
	})
	createEffect(() => {
		examplePlugin.$set({ count: props.count })
	})
	return div
}
