import { type NookId } from 'shared'
import { getNook } from 'shared-edge'
import { Show, type VoidComponent } from 'solid-js'
import {
	A,
	cache,
	createAsync,
	type RouteDefinition,
	type RouteSectionProps,
} from '@solidjs/router'
import RelativeDate from '~/components/relativeDate'

const getNookDetailsCached = cache(async (nook: string) => {
	'use server'
	return await getNook(nook as NookId)
}, 'nookDetails')

export const route = {
	preload({ params }) {
		void getNookDetailsCached(params.nook!)
	},
} satisfies RouteDefinition

export default function NookLayout(props: RouteSectionProps) {
	const nookDetails = createAsync(
		async () => await getNookDetailsCached(props.params.nook!),
	)
	return (
		<Show
			when={nookDetails() === undefined}
			fallback={
				<div class='flex'>
					<div class='grow'>{props.children}</div>
					<aside class='basis-40'>
						<Sidebar nook={props.params.nook!} nookDetails={nookDetails()} />
					</aside>
				</div>
			}
		>
			<a href={`/nooks/create?nook=${props.params.nook ?? ''}`}>Create Nook</a>
		</Show>
	)
}

const Sidebar: VoidComponent<{
	nook: string
	nookDetails: Awaited<ReturnType<typeof getNook>>
}> = (props) => {
	return (
		<Show when={props.nookDetails}>
			{(nd) => (
				<>
					<h1 class='text-lg font-bold'>/n/{props.nook}</h1>
					<A href={`/n/${props.nook}/templates`}>Templates</A>
					<div>
						Est. <RelativeDate date={nd().created} />
					</div>
					<div>mods:{nd().moderators}</div>
				</>
			)}
		</Show>
	)
}
