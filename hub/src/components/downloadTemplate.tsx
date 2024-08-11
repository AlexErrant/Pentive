import { type getTemplates } from 'shared-edge'
import { getAppMessenger } from '~/entry-client'
import { unwrap } from 'solid-js/store'
import { cwaClient } from 'app/src/trpcClient'
import { type Component } from 'solid-js'

type Template = Awaited<ReturnType<typeof getTemplates>>[0]

export const DownloadTemplate: Component<{ template: Template }> = (props) => {
	return (
		<button
			onClick={async () => {
				await getAppMessenger().addTemplate(unwrap(props.template))
				await cwaClient.subscribeToTemplate.mutate(props.template.id)
			}}
			disabled={props.template.til != null}
		>
			Download
		</button>
	)
}

export default DownloadTemplate
