import {
	createContext,
	type JSX,
	useContext,
	createSignal,
	type Signal,
} from 'solid-js'
import './templateSync.css'
import { throwExp } from 'shared/utility'

interface Signals {
	templateRowDelta: Signal<number | undefined>
	noteRowDelta: Signal<number | undefined>
}

const TableCountContext = createContext<Signals>()

export function TableCountProvider(props: { children: JSX.Element }) {
	return (
		<TableCountContext.Provider
			value={{
				// eslint-disable-next-line solid/reactivity
				templateRowDelta: createSignal(),
				// eslint-disable-next-line solid/reactivity
				noteRowDelta: createSignal(),
			}}
		>
			{props.children}
		</TableCountContext.Provider>
	)
}

export function useTableCountContext() {
	return (
		useContext(TableCountContext) ??
		throwExp('useTemplatesTableContext: cannot find a TemplatesTableContext')
	)
}
