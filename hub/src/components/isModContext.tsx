import { createAsync } from '@solidjs/router'
import {
	createContext,
	type Signal,
	type JSX,
	createSignal,
	useContext,
	createEffect,
} from 'solid-js'
import { getUserId } from '~/session'

const IsModContext = createContext<Signal<boolean>>()

export function IsModProvider(props: {
	moderators: string[]
	children: JSX.Element
}) {
	const userId = createAsync(async () => await getUserId())
	const [isMod, setIsMod] = createSignal<boolean>(false)
	createEffect(() => {
		if (props.moderators.includes(userId() as string)) setIsMod(true)
	})
	return (
		<IsModContext.Provider value={[isMod, setIsMod]}>
			{props.children}
		</IsModContext.Provider>
	)
}

export function useIsModContext() {
	const context = useContext(IsModContext)
	if (context == null) {
		throw new Error('useIsModContext: cannot find a IsModContext')
	}
	return context
}
