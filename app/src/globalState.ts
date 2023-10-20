import { createResource, createSignal, untrack } from 'solid-js'
import { cwaClient } from './trpcClient'
import { toastError, toastInfo } from './components/toasts'

// lowTODO have hub send app a message when a successful login occurs
export const [whoAmI] = createResource(async () => {
	const r = await cwaClient.whoAmI.query().catch((e) => {
		if (window.navigator.onLine) {
			toastError('Error occurred while verifying identity.', e)
		} else {
			toastInfo('Cannot validate identity while offline.')
		}
		return undefined
	})
	return r?.tag === 'Ok' ? r.ok : undefined
})

const currentTheme = () =>
	document.documentElement.className.includes('dark')
		? ('dark' as const)
		: ('light' as const)

export const [theme, setTheme] = createSignal<'light' | 'dark'>(currentTheme())

new MutationObserver((_: MutationRecord[]) => {
	const current = currentTheme()
	if (current !== untrack(theme)) {
		setTheme(current)
	}
}).observe(document.documentElement, {
	attributes: true,
})

export const agGridTheme = () =>
	theme() === 'light' ? 'ag-theme-alpine' : 'ag-theme-alpine-dark'
