import { For, Show, Suspense } from 'solid-js'
import { cast, type NookId, type RemoteTemplateId } from 'shared/brand'
import { getTemplate, getTemplateComments } from 'shared-edge'
import { DownloadSubscribeTemplate } from '~/components/downloadSubscribeTemplate'
import { ResizingIframe } from '~/components/resizingIframe'
import Comment from '~/components/comment'
import SubmitComment from '~/components/submitComment'
import { cwaClient } from '~/routes/cwaClient'
import { getUserId } from '~/session'
import { defaultRenderContainer, remoteToTemplate } from '~/lib/utility'
import {
	query,
	createAsync,
	type RouteDefinition,
	type RouteSectionProps,
} from '@solidjs/router'

const getTemplateCached = query(
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

const getTemplateCommentsCached = query(
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
					<DownloadSubscribeTemplate template={remoteTemplate()!} />
					<ul class='comment-children'>
						<SubmitComment
							// eslint-disable-next-line solid/reactivity -- doesn't need to be reactive
							onSubmit={async (text) => {
								await cwaClient.insertTemplateComment.mutate({
									templateId: cast(template().id),
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
