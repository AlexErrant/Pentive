import { For, Show } from 'solid-js'
import { type NookId } from 'shared'
import { getTemplates } from 'shared-edge'
import ResizingIframe from '~/components/resizingIframe'
import { getAppMessenger } from '~/entry-client'
import { remoteToTemplate } from '~/lib/utility'
import { unwrap } from 'solid-js/store'
import { getUserId } from '~/session'
import { cwaClient } from 'app/src/trpcClient'
import RelativeDate from '~/components/relativeDate'
import {
	A,
	cache,
	createAsync,
	type RouteDefinition,
	type RouteSectionProps,
} from '@solidjs/router'

const getTemplatesCached = cache(async (nook: NookId) => {
	'use server'
	const userId = (await getUserId()) ?? undefined
	return await getTemplates(nook, userId)
}, 'templates')

export const route = {
	preload({ params }) {
		void getTemplatesCached(params.nook as NookId)
	},
} satisfies RouteDefinition

export default function Thread(props: RouteSectionProps) {
	const templates = createAsync(
		async () => await getTemplatesCached(props.params.nook as NookId),
	)
	return (
		<>
			<Show when={templates()}>
				<ul>
					<For each={templates()}>
						{(template) => {
							const localTemplate = () => remoteToTemplate(template)
							return (
								<li>
									<h1>{template.name}</h1>
									<div>
										<button
											onClick={async () => {
												await getAppMessenger().addTemplate(unwrap(template))
												await cwaClient.subscribeToTemplate.mutate(template.id)
											}}
											disabled={template.til != null}
										>
											Download
										</button>
										<div>
											{template.til == null ? (
												''
											) : (
												<>
													Last synced at <RelativeDate date={template.til} />
												</>
											)}
										</div>
										<a href={`/n/${props.params.nook}/template/${template.id}`}>
											Comments: {template.comments}
										</a>
									</div>
									<ResizingIframe
										i={{
											tag: 'template',
											side: 'front',
											template: localTemplate(),
											index: 0,
										}}
									/>
									<ResizingIframe
										i={{
											tag: 'template',
											side: 'back',
											template: localTemplate(),
											index: 0,
										}}
									/>
									<A
										href={`/n/${props.params.nook}/template/${template.id}/edit`}
									>
										Edit
									</A>
								</li>
							)
						}}
					</For>
				</ul>
			</Show>
		</>
	)
}
