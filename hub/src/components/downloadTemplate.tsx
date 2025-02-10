import { getAppMessenger } from '~/lib/clientOnly'
import { unwrap } from 'solid-js/store'
import { cwaClient } from '~/routes/cwaClient'
import type { Component } from 'solid-js'
import { clientOnly } from '@solidjs/start'
import { createAsync } from '@solidjs/router'
import type { Template } from './downloadSubscribeTemplate'

export const DownloadTemplateDefault: Component<{ template: Template }> = (
	props,
) => {
	const hasRemoteNote = createAsync(
		async () =>
			await (await getAppMessenger()).hasRemoteTemplate(props.template.id),
	)
	return (
		<button
			onClick={async () => {
				await (await getAppMessenger()).addTemplate(unwrap(props.template))
				await cwaClient.subscribeToTemplate.mutate(props.template.id)
			}}
			disabled={hasRemoteNote()}
		>
			Download
		</button>
	)
}

export default DownloadTemplateDefault

export const DownloadTemplate = clientOnly(
	async () => await import('~/components/downloadTemplate'),
)
