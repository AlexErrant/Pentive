import { createEffect, createResource, createSignal, untrack } from 'solid-js'
import { cwaClient } from './trpcClient'

// lowTODO have hub send app a message when a successful login occurs
export const [whoAmI] = createResource(
	async () => await cwaClient.whoAmI.query(),
)

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

// eslint-disable-next-line import/first -- let's just group all the golden-layout css here
import 'golden-layout/dist/css/goldenlayout-base.css'
createEffect(() => {
	if (theme() === 'light') {
		import('golden-layout/dist/css/themes/goldenlayout-light-theme.css')
	} else import('golden-layout/dist/css/themes/goldenlayout-dark-theme.css')
})
