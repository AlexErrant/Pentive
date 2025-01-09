import { clientOnly } from '@solidjs/start'

export const ResizingIframe = clientOnly(
	async () => await import('~/components/resizingIframe'),
)

export const DownloadTemplate = clientOnly(
	async () => await import('~/components/downloadTemplate'),
)
