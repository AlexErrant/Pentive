import {
	createContext,
	type JSX,
	useContext,
	createSignal,
	type Signal,
} from 'solid-js'

type Mode = 'pretty' | 'split'

const DiffModeContext = createContext<Signal<Mode>>()

export function DiffModeProvider(props: { children: JSX.Element }) {
	return (
		// eslint-disable-next-line solid/reactivity
		<DiffModeContext.Provider value={createSignal<Mode>('pretty')}>
			{props.children}
		</DiffModeContext.Provider>
	)
}

export function useDiffModeContext() {
	const context = useContext(DiffModeContext)
	if (context == null) {
		throw new Error('useDiffModeContext: cannot find a DiffModeContext')
	}
	return context
}
