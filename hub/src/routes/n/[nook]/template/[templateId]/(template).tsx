import { type Component, For, Show, Suspense } from 'solid-js'
import { type RouteDataArgs, useRouteData } from 'solid-start'
import { createServerData$ } from 'solid-start/server'
import { type NookId, type RemoteTemplateId } from 'shared'
import { getTemplate, getTemplateComments } from 'shared-edge'
import ResizingIframe from '~/components/resizingIframe'
import Comment from '~/components/comment'
import SubmitComment from '~/components/submitComment'
import { cwaClient } from '~/routes/cwaClient'
import { getUserId } from '~/session'
import { getAppMessenger } from '~/root'
import { defaultRenderContainer } from 'shared-dom'
import { remoteToTemplate } from '~/lib/utility'
import { unwrap } from 'solid-js/store'

export function routeData({ params }: RouteDataArgs) {
	return {
		nook: () => params.nook as NookId,
		templateId: (): string => params.templateId,
		data: createServerData$(
			async ([nook, templateId], { request }) => {
				return {
					template: await getUserId(request).then(
						async (userId) =>
							await getTemplate(templateId as RemoteTemplateId, {
								userId: userId ?? undefined,
								nook: nook as NookId,
							}),
					),
					comments: await getTemplateComments(templateId as RemoteTemplateId),
				}
			},
			{ key: () => [params.nook, params.templateId] },
		),
	}
}

const Thread: Component = () => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { data, nook } = useRouteData<typeof routeData>()
	const template = () => remoteToTemplate(data()!.template!)
	return (
		<Suspense fallback={<p>Loading template...</p>}>
			<Show when={data()?.template} fallback={<p>"404 Not Found"</p>}>
				<div class='item-view-comments'>
					<p class='item-view-comments-header'>
						<For each={defaultRenderContainer.templateIndexes(template())}>
							{(index) => {
								return (
									<>
										<ResizingIframe
											i={{
												index,
												tag: 'template',
												side: 'front',
												template: template(),
											}}
										/>
										<ResizingIframe
											i={{
												index,
												tag: 'template',
												side: 'back',
												template: template(),
											}}
										/>
									</>
								)
							}}
						</For>
					</p>
					<button
						onClick={async () => {
							await getAppMessenger().addTemplate(unwrap(data()!.template!))
							await cwaClient.subscribeToTemplate.mutate(data()!.template!.id)
						}}
						disabled={data()?.template?.til != null}
					>
						Download
					</button>
					<ul class='comment-children'>
						<SubmitComment
							// eslint-disable-next-line solid/reactivity -- doesn't need to be reactive
							onSubmit={async (text) => {
								await cwaClient.insertTemplateComment.mutate({
									templateId: data()!.template!.id,
									text,
								})
							}}
						/>
						<For each={data()!.comments}>
							{(comment) => <Comment comment={comment} type='template' />}
						</For>
					</ul>
				</div>
			</Show>
		</Suspense>
	)
}

export default Thread
