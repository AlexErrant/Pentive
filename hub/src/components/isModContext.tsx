import { createContext, type JSX, useContext, type Accessor } from 'solid-js'
import { useUserIdContext } from './userIdContext'

const IsModContext = createContext<Accessor<boolean>>()

export function IsModProvider(props: {
	moderators: string[]
	children: JSX.Element
}) {
	const userId = useUserIdContext()
	const isMod = () => props.moderators.includes(userId() as string)
	return (
		<IsModContext.Provider value={isMod}>
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
