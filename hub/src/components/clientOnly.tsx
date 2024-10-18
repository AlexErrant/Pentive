import { clientOnly } from '@solidjs/start'

export const ResizingIframe = clientOnly(
	async () => await import('~/components/resizingIframe'),
)

export const ThemeSelector = clientOnly(async () => {
	const { ThemeSelector } = await import('shared-dom/themeSelector')
	return { default: ThemeSelector }
})
