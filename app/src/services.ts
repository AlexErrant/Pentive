import {
	type RenderContainerArgs,
	defaultRenderContainer,
} from 'shared-dom/renderContainer'
import Nav from './components/nav'
import ExamplePlugin from './components/examplePlugin'
import { syncGridOptions } from './pages/sync'

export const domContainer = {
	nav: Nav,
	examplePlugin: ExamplePlugin,
}

// the dependency injection container
export const defaultContainer = (args: RenderContainerArgs) => ({
	...defaultRenderContainer(args),
	...domContainer,
	getDate: () => new Date(),
	syncGridOptions,
})

export type Container = ReturnType<typeof defaultContainer>

export interface PluginExports {
	services?: (c: Container) => Partial<Container>
}
