import type { Container, PluginExports } from 'app/services'
import App from './App.svelte'
import { createEffect, type Setter, type VoidComponent } from 'solid-js'
import ExamplePlugin from './ExamplePlugin.svelte'
import { Router } from '@solidjs/router'
import { createComponent } from 'solid-js/web'

const services = (c: Container): Partial<Container> => {
	return {
		transformers: new Map(c.transformers).set(
			'edit',
			({ initialValue }) => '[EDITABLE]' + initialValue + '[/EDITABLE]',
		),
		nav: (props) =>
			createComponent(Router, {
				get children() {
					const div = document.createElement('div')

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
			get count() {
				return props.count
			},
			solidProps: props,
		},
	})
	createEffect(() => {
		examplePlugin.$set({ count: props.count })
	})
	return div
}
