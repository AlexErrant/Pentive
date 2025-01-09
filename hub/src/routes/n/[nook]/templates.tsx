import { For, Show } from 'solid-js'
import { type NookId } from 'shared/brand'
import { getTemplates } from 'shared-edge'
import { DownloadTemplate, ResizingIframe } from '~/components/clientOnly'
import { remoteToTemplate } from '~/lib/utility'
import { getUserId } from '~/session'
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
										<DownloadTemplate template={template} />
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
