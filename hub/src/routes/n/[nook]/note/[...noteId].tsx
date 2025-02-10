import { For, Show, Suspense } from 'solid-js'
import type { NookId, RemoteNoteId } from 'shared/brand'
import { getNote, getNoteComments } from 'shared-edge'
import { ResizingIframe } from '~/components/resizingIframe'
import Comment from '~/components/comment'
import SubmitComment from '~/components/submitComment'
import { cwaClient } from '~/routes/cwaClient'
import { getUserId } from '~/session'
import { noteOrds, toSampleCard } from 'shared-dom/cardHtml'
import {
	noteOrdsRenderContainer,
	remoteToNote,
	remoteToTemplate,
} from '~/lib/utility'
import {
	query,
	createAsync,
	type RouteDefinition,
	type RouteSectionProps,
} from '@solidjs/router'
import { DownloadSubscribeNote } from '~/components/downloadSubscribeNote'

const getNoteCached = query(async (noteId: RemoteNoteId) => {
	'use server'
	return await getUserId().then(async (userId) => await getNote(noteId, userId))
}, 'note')

const getNoteCommentsCached = query(async (noteId: RemoteNoteId) => {
	'use server'
	return await getNoteComments(noteId)
}, 'noteComments')

export const route = {
	preload({ params }) {
		void getNoteCached(params.noteId as RemoteNoteId)
		void getNoteCommentsCached(params.noteId as RemoteNoteId)
	},
} satisfies RouteDefinition

export default function Note(props: RouteSectionProps) {
	const remoteNote = createAsync(
		async () => await getNoteCached(props.params.noteId as RemoteNoteId),
		{ deferStream: true },
	)
	const comments = createAsync(
		async () =>
			await getNoteCommentsCached(props.params.noteId as RemoteNoteId),
	)
	const template = () => remoteToTemplate(remoteNote()!.template)
	const note = () => remoteToNote(remoteNote()!)
	return (
		<Show when={remoteNote()} fallback={<p>"404 Not Found"</p>}>
			<div class='item-view-comments'>
				<p class='item-view-comments-header'>
					<For
						each={noteOrds.bind(noteOrdsRenderContainer)(note(), template())}
					>
						{(ord) => {
							const card = () => toSampleCard(ord)
							return (
								<>
									<ResizingIframe
										i={{
											tag: 'card',
											side: 'front',
											template: template(),
											card: card(),
											note: note(),
										}}
									/>
									<ResizingIframe
										i={{
											tag: 'card',
											side: 'back',
											template: template(),
											card: card(),
											note: note(),
										}}
									/>
								</>
							)
						}}
					</For>
				</p>
				<DownloadSubscribeNote
					note={remoteNote()!}
					nook={props.params.nook as NookId}
				/>
				<ul class='comment-children'>
					<SubmitComment
						// eslint-disable-next-line solid/reactivity -- doesn't need to be reactive
						onSubmit={async (text) => {
							await cwaClient.insertNoteComment.mutate({
								noteId: remoteNote()!.id,
								text,
							})
						}}
					/>
					<Suspense>
						<For each={comments()}>
							{(comment) => <Comment comment={comment} type='note' />}
						</For>
					</Suspense>
				</ul>
			</div>
		</Show>
	)
}
