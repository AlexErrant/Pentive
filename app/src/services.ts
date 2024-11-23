import { routes } from './routes'
import {
	type RenderContainerArgs,
	defaultRenderContainer,
} from 'shared-dom/renderContainer'
import Nav from './components/nav'
import ExamplePlugin from './components/examplePlugin'
import { syncGridOptions } from './pages/sync'
import { pluginGridOptions } from './components/pluginsTable'
import { templateGridOptions } from './components/templatesTable'
import { cardGridOptions } from './components/cardsTable'
import { filterGridOptions } from './components/filtersTable'
import { db } from './db'

export const domContainer = {
	nav: Nav,
	examplePlugin: ExamplePlugin,
}

// the dependency injection container
export const defaultContainer = (args: RenderContainerArgs) => ({
	...defaultRenderContainer(args),
	...domContainer,
	routes,
	getDate: () => new Date(),
	syncGridOptions,
	pluginGridOptions,
	templateGridOptions,
	cardGridOptions,
	filterGridOptions,
	db,
})

export type Container = ReturnType<typeof defaultContainer>

export interface PluginExports {
	services?: (c: Container) => Partial<Container>
}
