import { For, Show } from 'solid-js'
import { getPosts, getNotes } from 'shared-edge'
import { noteOrds, toSampleCard } from 'shared-dom/cardHtml'
import { type NookId, type Ord } from 'shared/brand'
import { ResizingIframe } from '~/components/resizingIframe'
import { getUserId } from '~/session'
import {
	noteOrdsRenderContainer,
	remoteToNote,
	remoteToTemplate,
} from '~/lib/utility'
import RelativeDate from '~/components/relativeDate'
import {
	A,
	query,
	createAsync,
	type RouteDefinition,
	type RouteSectionProps,
} from '@solidjs/router'
import { getNookDetailsCached } from '~/lib/useServer'

const getPostsCached = query(async (nook: string) => {
	'use server'
	return await getPosts({ nook })
}, 'posts')

const getNotesCached = query(async (nook: string) => {
	'use server'
	return await getUserId().then(
		async (userId) => await getNotes(nook as NookId, userId),
	)
}, 'notes')

export const route = {
	preload({ params }) {
		void getPostsCached(params.nook!)
		void getNotesCached(params.nook!)
	},
} satisfies RouteDefinition

export default function Nook(props: RouteSectionProps) {
	const posts = createAsync(
		async () => await getPostsCached(props.params.nook!),
		{ deferStream: true },
	)
	const notes = createAsync(
		async () => await getNotesCached(props.params.nook!),
		{ deferStream: true },
	)
	const nookDetails = createAsync(
		async () => await getNookDetailsCached(props.params.nook),
	)
	return (
		<>
			<ul>
				<For each={posts()}>
					{(post) => (
						<li>
							<A href={`thread/${post.id}`}>{post.title}</A>
						</li>
					)}
				</For>
				<For each={notes()}>
					{(note) => {
						const localNote = () => remoteToNote(note.note)
						const template = () => remoteToTemplate(note.template)
						const count = () =>
							noteOrds.bind(noteOrdsRenderContainer)(localNote(), template())
								.length - 1
						return (
							<li>
								<div>
									{note.til == null ? (
										''
									) : (
										<>
											Last synced at <RelativeDate date={note.til} />
										</>
									)}
								</div>
								<div>{note.subscribers} subscribers</div>
								<div>
									{/* making this an <A> breaks because maps (e.g. `note.fieldValues`) aren't JSON serializable. Revisit if this issue is ever resolved. https://github.com/TanStack/bling/issues/9 */}
									<a href={`/n/${props.params.nook}/note/${note.id}`}>
										{note.comments} comments
									</a>
								</div>
								<ResizingIframe
									i={{
										tag: 'card',
										side: 'front',
										template: template(),
										card: toSampleCard(0 as Ord),
										note: localNote(),
									}}
								/>
								<Show when={count() !== 0}>+{count()}</Show>
							</li>
						)
					}}
				</For>
			</ul>
			<Show
				when={
					notes()?.length === 0 && // We optimize for when there is more than one note/post (which is more common).
					posts()?.length === 0 && // Only if there are none do we check to see if the nook exists, which is async.
					nookDetails() == null // If it doesn't, show the create link.
				}
			>
				<a href={`/nooks/create?nook=${props.params.nook ?? ''}`}>
					Create Nook
				</a>
			</Show>
		</>
	)
}
