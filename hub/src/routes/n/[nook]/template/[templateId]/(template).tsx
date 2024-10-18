import { For, Show, Suspense } from 'solid-js'
import { type NookId, type RemoteTemplateId } from 'shared/brand'
import { getTemplate, getTemplateComments } from 'shared-edge'
import { ResizingIframe } from '~/components/clientOnly'
import Comment from '~/components/comment'
import SubmitComment from '~/components/submitComment'
import { cwaClient } from '~/routes/cwaClient'
import { getUserId } from '~/session'
import { getAppMessenger } from '~/entry-client'
import { defaultRenderContainer, remoteToTemplate } from '~/lib/utility'
import { unwrap } from 'solid-js/store'
import {
	cache,
	createAsync,
	type RouteDefinition,
	type RouteSectionProps,
} from '@solidjs/router'

const getTemplateCached = cache(
	async (templateId: RemoteTemplateId, nook: NookId) => {
		'use server'
		return await getUserId().then(
			async (userId) =>
				await getTemplate(templateId, {
					userId: userId ?? undefined,
					nook,
				}),
		)
	},
	'template',
)

const getTemplateCommentsCached = cache(
	async (templateId: RemoteTemplateId) => {
		'use server'
		return await getTemplateComments(templateId)
	},
	'templateComments',
)

export const route = {
	preload({ params }) {
		void getTemplateCached(
			params.templateId as RemoteTemplateId,
			params.nook as NookId,
		)
		void getTemplateCommentsCached(params.templateId as RemoteTemplateId)
	},
} satisfies RouteDefinition

export default function Thread(props: RouteSectionProps) {
	const remoteTemplate = createAsync(
		async () =>
			await getTemplateCached(
				props.params.templateId as RemoteTemplateId,
				props.params.nook as NookId,
			),
	)
	const comments = createAsync(
		async () =>
			await getTemplateCommentsCached(
				props.params.templateId as RemoteTemplateId,
			),
	)
	const template = () => remoteToTemplate(remoteTemplate()!)
	return (
		<Suspense fallback={<p>Loading template...</p>}>
			<Show when={remoteTemplate()} fallback={<p>"404 Not Found"</p>}>
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
							await getAppMessenger().addTemplate(unwrap(remoteTemplate()!))
							await cwaClient.subscribeToTemplate.mutate(remoteTemplate()!.id)
						}}
						disabled={remoteTemplate()?.til != null}
					>
						Download
					</button>
					<ul class='comment-children'>
						<SubmitComment
							// eslint-disable-next-line solid/reactivity -- doesn't need to be reactive
							onSubmit={async (text) => {
								await cwaClient.insertTemplateComment.mutate({
									templateId: template().id,
									text,
								})
							}}
						/>
						<For each={comments()}>
							{(comment) => <Comment comment={comment} type='template' />}
						</For>
					</ul>
				</div>
			</Show>
		</Suspense>
	)
}
