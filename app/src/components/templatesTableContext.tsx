import {
	createContext,
	type JSX,
	useContext,
	createSignal,
	type Signal,
} from 'solid-js'
import './templateSync.css'
import { throwExp } from 'shared/utility'
import { type Template } from 'shared/domain/template'

interface Signals {
	addTemplate: Signal<Template | undefined>
}

const TemplatesTableContext = createContext<Signals>()

export function TemplatesTableProvider(props: { children: JSX.Element }) {
	return (
		<TemplatesTableContext.Provider
			value={{
				// eslint-disable-next-line solid/reactivity
				addTemplate: createSignal<Template>(),
			}}
		>
			{props.children}
		</TemplatesTableContext.Provider>
	)
}

export function useTemplatesTableContext() {
	return (
		useContext(TemplatesTableContext) ??
		throwExp('useTemplatesTableContext: cannot find a TemplatesTableContext')
	)
}
