import { type Component, For, Show, type VoidComponent } from 'solid-js'
import { A, type RouteDataArgs, useRouteData } from 'solid-start'
import { createServerData$ } from 'solid-start/server'
import { getPosts, getNotes, getNook } from 'shared-edge'
import { noteOrdsRenderContainer, noteOrds, toSampleCard } from 'shared-dom'
import { type NookId, type Ord } from 'shared'
import ResizingIframe from '~/components/resizingIframe'
import { getUserId } from '~/session'
import { remoteToNote, remoteToTemplate } from '~/lib/utility'
import RelativeDate from '~/components/relativeDate'

export function routeData({ params }: RouteDataArgs) {
	return {
		nook: () => params.nook,
		data: createServerData$(
			async (nook, { request }) => {
				return {
					nookDetails: await getNook(nook as NookId),
					posts: await getPosts({ nook }),
					notes: await getUserId(request).then(
						async (userId) => await getNotes(nook as NookId, userId),
					),
				}
			},
			{ key: () => params.nook },
		),
	}
}

const Threads: Component = () => {
	const { data, nook } = useRouteData<typeof routeData>()
	return (
		<Show
			when={data()?.nookDetails != null}
			fallback={<a href={`/nooks/create?nook=${nook() ?? ''}`}>Create Nook</a>}
		>
			<Show when={data()}>
				<div class='flex'>
					<div class='grow'>
						<MainContent
							nook={nook()!}
							nookDetails={data()!.nookDetails!}
							posts={data()!.posts}
							notes={data()!.notes}
						/>
					</div>
					<aside class='basis-40'>
						<Sidebar
							nook={nook()!}
							nookDetails={data()!.nookDetails!}
							posts={data()!.posts}
							notes={data()!.notes}
						/>
					</aside>
				</div>
			</Show>
		</Show>
	)
}

const Sidebar: VoidComponent<{
	nook: string
	nookDetails: NonNullable<Awaited<ReturnType<typeof getNook>>>
	posts: Awaited<ReturnType<typeof getPosts>>
	notes: Awaited<ReturnType<typeof getNotes>>
}> = (props) => {
	return (
		<>
			<h1 class='text-lg font-bold'>/n/{props.nook}</h1>
			<A href={`/n/${props.nook}/templates`}>Templates</A>
			<div>
				Est. <RelativeDate date={props.nookDetails.created} />
			</div>
			<div>mods:{props.nookDetails.moderators}</div>
		</>
	)
}

const MainContent: VoidComponent<{
	nook: string
	nookDetails: NonNullable<Awaited<ReturnType<typeof getNook>>>
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

export default Threads
