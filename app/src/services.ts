import { defaultRenderContainer } from 'shared-dom'
import Nav from './components/nav'
import ExamplePlugin from './components/examplePlugin'

export const domContainer = {
	nav: Nav,
	examplePlugin: ExamplePlugin,
}

// the dependency injection container
export const defaultContainer = {
	...defaultRenderContainer,
	...domContainer,
	getDate: () => new Date(),
}

export type Container = typeof defaultContainer

export interface PluginExports {
	services?: (c: Container) => Partial<Container>
}
