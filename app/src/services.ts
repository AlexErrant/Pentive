import { defaultRenderContainer } from 'shared-dom'
import Nav from './components/nav'
import ExamplePlugin from './components/examplePlugin'
import {
	toastError,
	toastFatal,
	toastImpossible,
	toastInfo,
	toastWarn,
} from './components/toasts'

export const domContainer = {
	nav: Nav,
	examplePlugin: ExamplePlugin,
}

// the dependency injection container
export const defaultContainer = {
	...defaultRenderContainer,
	...domContainer,
	getDate: () => new Date(),
	toastError,
	toastFatal,
	toastImpossible,
	toastInfo,
	toastWarn,
}

export type Container = typeof defaultContainer

export interface PluginExports {
	services?: (c: Container) => Partial<Container>
}
