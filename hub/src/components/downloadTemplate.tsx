import { type getTemplates } from 'shared-edge'
import { getAppMessenger } from '~/lib/clientOnly'
import { unwrap } from 'solid-js/store'
import { cwaClient } from 'app/trpcClient'
import { type Component } from 'solid-js'
import { clientOnly } from '@solidjs/start'

type Template = Awaited<ReturnType<typeof getTemplates>>[0]

export const DownloadTemplateDefault: Component<{ template: Template }> = (
	props,
) => {
	return (
		<button
			onClick={async () => {
				await (await getAppMessenger()).addTemplate(unwrap(props.template))
				await cwaClient.subscribeToTemplate.mutate(props.template.id)
			}}
			disabled={props.template.til != null}
		>
			Download
		</button>
	)
}

export default DownloadTemplateDefault

export const DownloadTemplate = clientOnly(
	async () => await import('~/components/downloadTemplate'),
)
