import { ToggleGroup } from '@kobalte/core/toggle-group'
import {
	createContext,
	type JSX,
	useContext,
	createSignal,
	type Signal,
	type VoidComponent,
} from 'solid-js'
import './templateSync.css'

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

export const DiffModeToggleGroup: VoidComponent = () => {
	const [diffMode, setDiffMode] = useDiffModeContext()
	return (
		<ToggleGroup
			value={diffMode()}
			onChange={(x) => {
				if (x != null) {
					setDiffMode(x as Mode)
				}
			}}
			class='toggle-group'
		>
			<ToggleGroup.Item class='toggle-group__item' value='pretty'>
				Pretty
			</ToggleGroup.Item>
			<ToggleGroup.Item class='toggle-group__item' value='split'>
				Split
			</ToggleGroup.Item>
		</ToggleGroup>
	)
}
