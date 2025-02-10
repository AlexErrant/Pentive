import { createAsync } from '@solidjs/router'
import type { UserId } from 'shared/brand'
import { createContext, type JSX, useContext, type Accessor } from 'solid-js'
import { getUserId } from '~/session'

const UserIdContext = createContext<Accessor<UserId | null>>()

export function UserIdProvider(props: { children: JSX.Element }) {
	const userId = createAsync(async () => await getUserId(), {
		initialValue: null,
	})
	return (
		<UserIdContext.Provider value={userId}>
			{props.children}
		</UserIdContext.Provider>
	)
}

export function useUserIdContext() {
	const context = useContext(UserIdContext)
	if (context == null) {
		throw new Error('useUserIdContext: cannot find a UserIdContext')
	}
	return context
}
