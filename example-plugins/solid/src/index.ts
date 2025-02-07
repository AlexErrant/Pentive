import type { Container, PluginExports } from 'app/services'
import { Nav } from './nav'
import ExamplePlugin from './examplePlugin'

const services = (c: Container): Partial<Container> => {
	return {
		transformers: new Map(c.transformers).set(
			'edit',
			({ initialValue }) => '[EDITABLE]' + initialValue + '[/EDITABLE]',
		),
		nav: Nav,
		examplePlugin: ExamplePlugin,
	}
}

const exports: PluginExports = {
	services,
}

export default exports
