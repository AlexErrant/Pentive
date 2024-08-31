import { For, Show, Suspense } from 'solid-js'
import { type NookId, type RemoteNoteId } from 'shared'
import { getNote, getNoteComments } from 'shared-edge'
import { ResizingIframe } from '~/components/clientOnly'
import Comment from '~/components/comment'
import SubmitComment from '~/components/submitComment'
import { cwaClient } from '~/routes/cwaClient'
import { getUserId } from '~/session'
import { getAppMessenger } from '~/entry-client'
import { noteOrds, noteOrdsRenderContainer, toSampleCard } from 'shared-dom'
import { remoteToNote, remoteToTemplate } from '~/lib/utility'
import { unwrap } from 'solid-js/store'
import {
	cache,
	createAsync,
	type RouteDefinition,
	type RouteSectionProps,
} from '@solidjs/router'

const getNoteCached = cache(async (noteId: RemoteNoteId) => {
	'use server'
	return await getUserId().then(async (userId) => await getNote(noteId, userId))
}, 'note')

const getNoteCommentsCached = cache(async (noteId: RemoteNoteId) => {
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
	)
	const comments = createAsync(
		async () =>
			await getNoteCommentsCached(props.params.noteId as RemoteNoteId),
	)
	const template = () => remoteToTemplate(remoteNote()!.template)
	const note = () => remoteToNote(remoteNote()!)
	return (
		<Suspense fallback={<p>Loading note...</p>}>
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
					<button
						onClick={async () => {
							await getAppMessenger().addNote(
								unwrap(remoteNote()!),
								props.params.nook as NookId,
							)
							await cwaClient.subscribeToNote.mutate(remoteNote()!.id)
						}}
						disabled={remoteNote()!.til != null}
					>
						Download
					</button>
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
						<For each={comments()}>
							{(comment) => <Comment comment={comment} type='note' />}
						</For>
					</ul>
				</div>
			</Show>
		</Suspense>
	)
}
