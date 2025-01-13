import { type getTemplates } from 'shared-edge'
import { cwaClient } from '~/routes/cwaClient'
import { type Component } from 'solid-js'
import { DownloadTemplate } from './downloadTemplate'

export type Template = Awaited<ReturnType<typeof getTemplates>>[0]

export const DownloadSubscribeTemplate: Component<{ template: Template }> = (
	props,
) => {
	return (
		<>
			<DownloadTemplate template={props.template} />
			<button
				onClick={async () => {
					await cwaClient.subscribeToTemplate.mutate(props.template.id)
				}}
				disabled={props.template.til != null}
			>
				Subscribe
			</button>
		</>
	)
}
