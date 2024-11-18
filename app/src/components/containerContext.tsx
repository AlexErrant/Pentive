import { createContext, type JSX, useContext } from 'solid-js'
import { C } from '../topLevelAwait'
import { throwExp } from 'shared/utility'

const ContainerContext = createContext<typeof C>()

export function ContainerProvider(props: { children: JSX.Element }) {
	return (
		<ContainerContext.Provider value={C}>
			{props.children}
		</ContainerContext.Provider>
	)
}

export function useContainerContext() {
	return useContext(ContainerContext) ?? throwExp()
}
