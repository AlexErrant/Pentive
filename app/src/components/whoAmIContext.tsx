import {
	createContext,
	type JSX,
	useContext,
	createResource,
	type Resource,
} from 'solid-js'
import './templateSync.css'
import { C } from '../topLevelAwait'
import { cwaClient } from '../trpcClient'
import { type UserId } from 'shared/brand'
import { throwExp } from 'shared/utility'

const WhoAmIContext = createContext<Resource<UserId | undefined>>()

export function WhoAmIProvider(props: { children: JSX.Element }) {
	// lowTODO have hub send app a message when a successful login occurs
	const [whoAmI] = createResource(async () => {
		const r = await cwaClient.whoAmI.query().catch((e) => {
			if (window.navigator.onLine) {
				C.toastError('Error occurred while verifying identity.', e)
			} else {
				C.toastInfo('Cannot validate identity while offline.')
			}
			return undefined
		})
		return r?.tag === 'Ok' ? r.ok : undefined
	})
	return (
		<WhoAmIContext.Provider value={whoAmI}>
			{props.children}
		</WhoAmIContext.Provider>
	)
}

export function useWhoAmIContext() {
	return (
		useContext(WhoAmIContext) ??
		throwExp('useWhoAmIContext: cannot find a WhoAmIContext')
	)
}
