import { For, Show, type VoidComponent } from 'solid-js'
import { getPosts, getNotes } from 'shared-edge'
import { noteOrds, toSampleCard } from 'shared-dom'
import { type NookId, type Ord } from 'shared'
import { ResizingIframe } from '~/components/clientOnly'
import { getUserId } from '~/session'
import {
	noteOrdsRenderContainer,
	remoteToNote,
	remoteToTemplate,
} from '~/lib/utility'
import RelativeDate from '~/components/relativeDate'
import {
	A,
	cache,
	createAsync,
	type RouteDefinition,
	type RouteSectionProps,
} from '@solidjs/router'

const getPostsCached = cache(async (nook: string) => {
	'use server'
	return await getPosts({ nook })
}, 'posts')

const getNotesCached = cache(async (nook: string) => {
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
	)
	const notes = createAsync(
		async () => await getNotesCached(props.params.nook!),
	)
	return (
		<Show when={posts() != null && notes()}>
			<MainContent
				nook={props.params.nook!}
				posts={posts()!}
				notes={notes()!}
			/>
		</Show>
	)
}

const MainContent: VoidComponent<{
	nook: string
	posts: Awaited<ReturnType<typeof getPosts>>
	notes: Awaited<ReturnType<typeof getNotes>>
}> = (props) => {
	return (
		<ul>
			<For each={props.posts}>
				{(post) => (
					<li>
						<A href={`thread/${post.id}`}>{post.title}</A>
					</li>
				)}
			</For>
			<For each={props.notes}>
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
								<a href={`/n/${props.nook}/note/${note.id}`}>
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
	)
}
